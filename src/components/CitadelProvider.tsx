import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  loadWebLLMModule,
  type ChatCompletionMessageParam,
  type MLCEngineInterface,
  type InitProgressReport,
  type WebLlmAppConfig,
} from '@/lib/webllm-client';

import {
  CitadelContext,
  type CitadelAppSettings,
  type CitadelContextType,
  type CitadelMessage,
  type LoadProgress,
} from '@/contexts/CitadelContext';
import { MODEL_OPTIONS } from '@/lib/webllm-models';
import { getKnowledgePackById } from '@/lib/knowledge-packs';
import {
  clearAllCitadelData,
  deleteKnowledgePack,
  estimateStorageUsage,
  getKnowledgePack,
  getSetting,
  listKnowledgePacks,
  saveKnowledgePack,
  saveSetting,
  type DownloadedKnowledgePack,
} from '@/lib/citadel-storage';
import { buildKnowledgeContext, rankKnowledgeDocuments } from '@/lib/citadel-rag';

const SETTINGS_KEY = {
  selectedModelId: 'citadel.selectedModelId',
  setupComplete: 'citadel.setupComplete',
  autoLoadModel: 'citadel.autoLoadModel',
} as const;

const DEFAULT_MODEL_ID = MODEL_OPTIONS.find(model => model.recommended)?.id ?? MODEL_OPTIONS[0].id;

const defaultSettings: CitadelAppSettings = {
  selectedModelId: DEFAULT_MODEL_ID,
  setupComplete: false,
  autoLoadModel: true,
};

function readBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) {
    return fallback;
  }

  return value === 'true';
}

function normalizeProgress(report: InitProgressReport): LoadProgress {
  return {
    progress: Number.isFinite(report.progress) ? Math.max(0, Math.min(1, report.progress)) : 0,
    text: report.text,
    timeElapsed: report.timeElapsed,
  };
}

async function getWebLLMModule() {
  return loadWebLLMModule();
}

function createModelAppConfig(prebuiltAppConfig: WebLlmAppConfig): WebLlmAppConfig {
  const allowed = new Set(MODEL_OPTIONS.map(model => model.id));

  return {
    ...prebuiltAppConfig,
    cacheBackend: 'indexeddb',
    model_list: prebuiltAppConfig.model_list.filter(model => allowed.has(model.model_id)),
  };
}

async function fetchKnowledgePackFile(filePath: string): Promise<Omit<DownloadedKnowledgePack, 'downloadedAt'>> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to download knowledge pack from ${filePath}`);
  }

  const data = await response.json() as Omit<DownloadedKnowledgePack, 'downloadedAt'>;

  if (!data.id || !Array.isArray(data.documents)) {
    throw new Error('Knowledge pack file has invalid structure.');
  }

  return data;
}

export function CitadelProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<MLCEngineInterface | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isLoadingEngine, setIsLoadingEngine] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ progress: 0, text: 'Idle', timeElapsed: 0 });

  const [appSettings, setAppSettings] = useState<CitadelAppSettings>(defaultSettings);
  const [downloadedPackIds, setDownloadedPackIds] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [hasWebGpu, setHasWebGpu] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return 'gpu' in navigator || typeof WebAssembly !== 'undefined';
  });

  const engineRef = useRef<MLCEngineInterface | null>(null);
  const webllmRef = useRef<Awaited<ReturnType<typeof loadWebLLMModule>> | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSettings() {
      const [selectedModelId, setupCompleteRaw, autoLoadRaw] = await Promise.all([
        getSetting(SETTINGS_KEY.selectedModelId),
        getSetting(SETTINGS_KEY.setupComplete),
        getSetting(SETTINGS_KEY.autoLoadModel),
      ]);

      if (!mounted) {
        return;
      }

      setAppSettings({
        selectedModelId: selectedModelId ?? defaultSettings.selectedModelId,
        setupComplete: readBoolean(setupCompleteRaw, defaultSettings.setupComplete),
        autoLoadModel: readBoolean(autoLoadRaw, defaultSettings.autoLoadModel),
      });
    }

    bootstrapSettings().catch(error => {
      console.error('Failed to bootstrap Citadel settings:', error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshKnowledgePacks = async () => {
    const packs = await listKnowledgePacks();
    setDownloadedPackIds(packs.map(pack => pack.id));
  };

  useEffect(() => {
    refreshKnowledgePacks().catch(error => {
      console.error('Failed to load local knowledge packs:', error);
    });
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') {
      return;
    }

    setHasWebGpu('gpu' in navigator || typeof WebAssembly !== 'undefined');
  }, []);

  const loadModel = async (modelId: string): Promise<void> => {
    setEngineError(null);
    setIsLoadingEngine(true);
    setIsEngineReady(false);
    setLoadProgress({ progress: 0, text: 'Preparing model download…', timeElapsed: 0 });

    try {
      if (typeof navigator === 'undefined') {
        throw new Error('Browser runtime is required for local model loading.');
      }

      if (engineRef.current) {
        try {
          await engineRef.current.unload();
        } catch (error) {
          console.warn('Failed to unload previous model cleanly:', error);
        }
      }

      const webllm = webllmRef.current ?? await getWebLLMModule();
      webllmRef.current = webllm;
      const modelAppConfig = createModelAppConfig(webllm.prebuiltAppConfig);

      const modelExists = modelAppConfig.model_list.some((model) => model.model_id === modelId);
      if (!modelExists) {
        throw new Error(`Model ${modelId} is not available in the current WebLLM runtime. Please choose another model.`);
      }

      const createdEngine = await webllm.CreateMLCEngine(modelId, {
        appConfig: modelAppConfig,
        initProgressCallback: (report) => {
          setLoadProgress(normalizeProgress(report));
        },
      });

      setEngine(createdEngine);
      setIsEngineReady(true);
      setCurrentModelId(modelId);
      setLoadProgress({ progress: 1, text: 'Model ready', timeElapsed: 0 });

      await saveSetting(SETTINGS_KEY.selectedModelId, modelId);
      setAppSettings(current => ({ ...current, selectedModelId: modelId }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error while loading model.';
      setEngineError(message);
      setIsEngineReady(false);
      setCurrentModelId(null);
      throw error;
    } finally {
      setIsLoadingEngine(false);
    }
  };

  useEffect(() => {
    const shouldAutoLoad = appSettings.setupComplete && appSettings.autoLoadModel;
    if (!shouldAutoLoad) {
      return;
    }

    if (engineRef.current || isLoadingEngine) {
      return;
    }

    loadModel(appSettings.selectedModelId).catch(error => {
      console.error('Auto-loading model failed:', error);
    });
  }, [appSettings.setupComplete, appSettings.autoLoadModel, appSettings.selectedModelId, isLoadingEngine]);

  const unloadModel = async (): Promise<void> => {
    if (!engineRef.current) {
      return;
    }

    try {
      await engineRef.current.unload();
    } finally {
      setEngine(null);
      setIsEngineReady(false);
      setCurrentModelId(null);
      setLoadProgress({ progress: 0, text: 'Idle', timeElapsed: 0 });
    }
  };

  const installKnowledgePack = async (packId: string): Promise<void> => {
    const packMeta = getKnowledgePackById(packId);
    if (!packMeta) {
      throw new Error(`Unknown knowledge pack: ${packId}`);
    }

    const downloaded = await fetchKnowledgePackFile(packMeta.filePath);
    await saveKnowledgePack(downloaded);
    await refreshKnowledgePacks();
  };

  const removeKnowledgePack = async (packId: string): Promise<void> => {
    await deleteKnowledgePack(packId);
    await refreshKnowledgePacks();
  };

  const saveSettings = async (partial: Partial<CitadelAppSettings>): Promise<void> => {
    const next = { ...appSettings, ...partial };

    await Promise.all([
      saveSetting(SETTINGS_KEY.selectedModelId, next.selectedModelId),
      saveSetting(SETTINGS_KEY.setupComplete, String(next.setupComplete)),
      saveSetting(SETTINGS_KEY.autoLoadModel, String(next.autoLoadModel)),
    ]);

    setAppSettings(next);
  };

  const completeInitialSetup = async (payload: {
    selectedModelId: string;
    packIds: string[];
    autoLoadModel: boolean;
  }): Promise<void> => {
    for (const packId of payload.packIds) {
      const existing = await getKnowledgePack(packId);
      if (!existing) {
        await installKnowledgePack(packId);
      }
    }

    await saveSettings({
      selectedModelId: payload.selectedModelId,
      setupComplete: true,
      autoLoadModel: payload.autoLoadModel,
    });

    if (payload.autoLoadModel) {
      await loadModel(payload.selectedModelId);
    }
  };

  const sendMessage = async (input: {
    userMessage: string;
    history: CitadelMessage[];
    useKnowledge: boolean;
    onToken?: (token: string) => void;
  }): Promise<{ text: string; runtimeStats: string }> => {
    if (!engineRef.current) {
      throw new Error('Local model is not loaded yet.');
    }

    const packs = await listKnowledgePacks();
    const ranking = input.useKnowledge ? rankKnowledgeDocuments(input.userMessage, packs, 4) : [];
    const contextBlock = input.useKnowledge ? buildKnowledgeContext(ranking) : 'Knowledge mode disabled by user.';

    const systemPrompt = [
      'You are Citadel Chat, an offline-first resilience assistant.',
      'You provide practical, step-by-step, safety-aware guidance.',
      'Use only local context and the user prompt. If unknown, state uncertainty clearly.',
      'Keep answers concise.',
      'Always end every response with one final line in this exact format: Confidence: X%',
      'X must be an integer from 0 to 100, where 100% means highest confidence in the answer.',
      '',
      'Local knowledge context:',
      contextBlock,
    ].join('\n');

    const prior = input.history
      .filter(message => message.role !== 'system')
      .slice(-8)
      .map<ChatCompletionMessageParam>((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }));

    const requestMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...prior,
      { role: 'user', content: input.userMessage },
    ];

    const stream = await engineRef.current.chat.completions.create({
      messages: requestMessages,
      stream: true,
      temperature: 0.3,
      max_tokens: 700,
      top_p: 0.9,
      stream_options: { include_usage: true },
    });

    let outputText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        outputText += delta;
        if (input.onToken) {
          input.onToken(delta);
        }
      }
    }

    const runtimeStats = await engineRef.current.runtimeStatsText();

    return {
      text: outputText.trim(),
      runtimeStats,
    };
  };

  const getStorageInfo = async (): Promise<{ usedBytes: number; quotaBytes: number } | null> => {
    return estimateStorageUsage();
  };

  const resetApplicationData = async (): Promise<void> => {
    await unloadModel();

    const webllm = webllmRef.current ?? await getWebLLMModule();
    webllmRef.current = webllm;
    const modelAppConfig = createModelAppConfig(webllm.prebuiltAppConfig);

    for (const model of MODEL_OPTIONS) {
      try {
        await webllm.deleteModelAllInfoInCache(model.id, modelAppConfig);
      } catch {
        // best-effort cache cleanup
      }
    }

    await clearAllCitadelData();

    setAppSettings(defaultSettings);
    setDownloadedPackIds([]);
    setEngineError(null);
  };

  const cachedModelStatuses = useQuery({
    queryKey: ['citadel', 'cached-models'],
    queryFn: async () => {
      try {
        const webllm = webllmRef.current ?? await getWebLLMModule();
        webllmRef.current = webllm;
        const modelAppConfig = createModelAppConfig(webllm.prebuiltAppConfig);

        const entries = await Promise.all(
          MODEL_OPTIONS.map(async (model) => {
            const cached = await webllm.hasModelInCache(model.id, modelAppConfig);
            return [model.id, cached] as const;
          }),
        );

        return Object.fromEntries(entries) as Record<string, boolean>;
      } catch {
        return {};
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const contextValue: CitadelContextType = {
    engine,
    isEngineReady,
    isLoadingEngine,
    engineError,
    currentModelId,
    loadProgress,

    isOnline,
    hasWebGpu,

    appSettings,
    downloadedPackIds,

    availableModels: MODEL_OPTIONS,
    cachedModelStatus: cachedModelStatuses.data ?? {},

    loadModel,
    unloadModel,

    sendMessage,

    installKnowledgePack,
    removeKnowledgePack,
    refreshKnowledgePacks,

    saveSettings,
    completeInitialSetup,

    getStorageInfo,
    resetApplicationData,
  };

  return (
    <CitadelContext.Provider value={contextValue}>
      {children}
    </CitadelContext.Provider>
  );
}
