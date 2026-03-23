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
  type BenchmarkResult,
  type BrowserKind,
  type CitadelContextType,
  type CitadelMessage,
  type LoadProgress,
  type RuntimeCompatibility,
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
  benchmarkResult: 'citadel.benchmarkResult',
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

function detectBrowserInfo(userAgent: string): { browser: BrowserKind; version: string | null } {
  const ua = userAgent.toLowerCase();

  const edgeMatch = ua.match(/edg\/(\d+(?:\.\d+)?)/);
  if (edgeMatch) return { browser: 'edge', version: edgeMatch[1] };

  const operaMatch = ua.match(/opr\/(\d+(?:\.\d+)?)/);
  if (operaMatch) return { browser: 'opera', version: operaMatch[1] };

  const firefoxMatch = ua.match(/firefox\/(\d+(?:\.\d+)?)/);
  if (firefoxMatch) return { browser: 'firefox', version: firefoxMatch[1] };

  const chromeMatch = ua.match(/chrome\/(\d+(?:\.\d+)?)/);
  if (chromeMatch) return { browser: 'chrome', version: chromeMatch[1] };

  const safariMatch = ua.match(/version\/(\d+(?:\.\d+)?).*safari/);
  if (safariMatch) return { browser: 'safari', version: safariMatch[1] };

  return { browser: 'other', version: null };
}

function buildCompatibilitySnapshot(): RuntimeCompatibility {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return {
      browser: 'other',
      browserVersion: null,
      status: 'unsupported',
      webGpuSupported: false,
      secureContext: false,
      hardwareConcurrency: null,
      deviceMemoryGB: null,
      headline: 'Browser runtime required',
      detail: 'Citadel Chat local AI requires a browser environment.',
      recommendations: ['Open the app in a modern desktop browser.'],
    };
  }

  const { browser, version } = detectBrowserInfo(navigator.userAgent);
  const webGpuSupported = 'gpu' in navigator;
  const secureContext = window.isSecureContext;
  const hardwareConcurrency = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : null;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemoryGB = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;

  let status: RuntimeCompatibility['status'] = webGpuSupported && secureContext ? 'supported' : 'limited';
  const recommendations: string[] = [];

  if (!secureContext) {
    status = 'unsupported';
    recommendations.push('Use HTTPS or localhost. WebGPU is blocked on insecure contexts.');
  }

  if (!webGpuSupported) {
    if (browser === 'firefox') {
      status = 'limited';
      recommendations.push('Firefox WebGPU support varies by platform/version. Prefer Chrome or Edge for best results.');
    } else if (browser === 'safari') {
      status = 'limited';
      recommendations.push('On Safari, ensure latest macOS/iOS and enable WebGPU in advanced/experimental settings if needed.');
    } else if (browser === 'chrome' || browser === 'edge' || browser === 'opera') {
      status = 'limited';
      recommendations.push('Update your browser to latest stable and ensure GPU acceleration is enabled.');
    } else {
      status = 'unsupported';
      recommendations.push('Use a recent Chrome or Edge release for strongest WebLLM compatibility.');
    }
  } else {
    recommendations.push('WebGPU detected. Local model inference should run in this browser.');
  }

  const headline =
    status === 'supported'
      ? 'Runtime compatible'
      : status === 'limited'
        ? 'Runtime partially supported'
        : 'Runtime not supported';

  const detail =
    status === 'supported'
      ? `${browser.toUpperCase()}${version ? ` ${version}` : ''} is ready for local inference.`
      : `${browser.toUpperCase()}${version ? ` ${version}` : ''} may have limited WebLLM support on this device.`;

  return {
    browser,
    browserVersion: version,
    status,
    webGpuSupported,
    secureContext,
    hardwareConcurrency,
    deviceMemoryGB,
    headline,
    detail,
    recommendations,
  };
}

function chooseBenchmarkRecommendation(score: number, availableModels: string[]): { tier: BenchmarkResult['tier']; modelId: string } {
  const has = (id: string) => availableModels.includes(id);

  if (score >= 80) {
    return {
      tier: 'ultra',
      modelId: has('Qwen3-4B-q4f16_1-MLC') ? 'Qwen3-4B-q4f16_1-MLC' : (has('Llama-3.2-3B-Instruct-q4f16_1-MLC') ? 'Llama-3.2-3B-Instruct-q4f16_1-MLC' : availableModels[0]),
    };
  }

  if (score >= 60) {
    return {
      tier: 'high',
      modelId: has('Qwen3-1.7B-q4f16_1-MLC') ? 'Qwen3-1.7B-q4f16_1-MLC' : (has('Qwen2.5-3B-Instruct-q4f16_1-MLC') ? 'Qwen2.5-3B-Instruct-q4f16_1-MLC' : availableModels[0]),
    };
  }

  if (score >= 40) {
    return {
      tier: 'medium',
      modelId: has('Llama-3.2-1B-Instruct-q4f16_1-MLC') ? 'Llama-3.2-1B-Instruct-q4f16_1-MLC' : (has('Qwen2.5-1.5B-Instruct-q4f16_1-MLC') ? 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' : availableModels[0]),
    };
  }

  return {
    tier: 'low',
    modelId: has('SmolLM2-360M-Instruct-q4f16_1-MLC') ? 'SmolLM2-360M-Instruct-q4f16_1-MLC' : availableModels[0],
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
  const [runtimeCompatibility, setRuntimeCompatibility] = useState<RuntimeCompatibility>(() => buildCompatibilitySnapshot());
  const [hasWebGpu, setHasWebGpu] = useState<boolean>(() => buildCompatibilitySnapshot().webGpuSupported);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);
  const [runtimeModelSupport, setRuntimeModelSupport] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MODEL_OPTIONS.map(model => [model.id, true])),
  );

  const engineRef = useRef<MLCEngineInterface | null>(null);
  const webllmRef = useRef<Awaited<ReturnType<typeof loadWebLLMModule>> | null>(null);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSettings() {
      const [selectedModelId, setupCompleteRaw, autoLoadRaw, benchmarkRaw] = await Promise.all([
        getSetting(SETTINGS_KEY.selectedModelId),
        getSetting(SETTINGS_KEY.setupComplete),
        getSetting(SETTINGS_KEY.autoLoadModel),
        getSetting(SETTINGS_KEY.benchmarkResult),
      ]);

      if (!mounted) {
        return;
      }

      setAppSettings({
        selectedModelId: selectedModelId ?? defaultSettings.selectedModelId,
        setupComplete: readBoolean(setupCompleteRaw, defaultSettings.setupComplete),
        autoLoadModel: readBoolean(autoLoadRaw, defaultSettings.autoLoadModel),
      });

      if (benchmarkRaw) {
        try {
          const parsed = JSON.parse(benchmarkRaw) as BenchmarkResult;
          setBenchmarkResult(parsed);
        } catch {
          setBenchmarkResult(null);
        }
      }
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

    const snapshot = buildCompatibilitySnapshot();
    setRuntimeCompatibility(snapshot);
    setHasWebGpu(snapshot.webGpuSupported);
  }, []);

  useEffect(() => {
    let mounted = true;

    getWebLLMModule()
      .then((webllm) => {
        webllmRef.current = webllm;
        const modelAppConfig = createModelAppConfig(webllm.prebuiltAppConfig);
        const supported = new Set(modelAppConfig.model_list.map(model => model.model_id));

        if (mounted) {
          setRuntimeModelSupport(
            Object.fromEntries(MODEL_OPTIONS.map(model => [model.id, supported.has(model.id)])),
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setRuntimeModelSupport(Object.fromEntries(MODEL_OPTIONS.map(model => [model.id, true])));
        }
      });

    return () => {
      mounted = false;
    };
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

      console.log(`[Citadel] Initiating load for model: ${modelId}`);

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
      console.log(`[Citadel] Model ${modelId} exists in current runtime manifest: ${modelExists}. Total models available: ${modelAppConfig.model_list.length}`);

      if (!modelExists) {
        throw new Error(`Model ${modelId} is not available in the current WebLLM runtime registry. Available models: ${modelAppConfig.model_list.map(m => m.model_id).slice(0, 5).join(', ')}...`);
      }

      const createdEngine = await webllm.CreateMLCEngine(modelId, {
        appConfig: modelAppConfig,
        initProgressCallback: (report) => {
          console.log(`[Citadel] Load progress: ${report.text} (${Math.round(report.progress * 100)}%)`);
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
      console.error('[Citadel] Critical load error:', error);
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

  const runOnboardingBenchmark = async (): Promise<BenchmarkResult> => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new Error('Benchmark requires browser runtime.');
    }

    setIsBenchmarkRunning(true);

    try {
      const start = performance.now();

      let synthetic = 0;
      for (let i = 0; i < 1_000_000; i += 1) {
        synthetic += Math.sqrt(i % 1000);
      }
      const cpuMs = performance.now() - start;

      const gpuAvailable = 'gpu' in navigator;
      const gpuScore = gpuAvailable ? 40 : 12;
      const cpuScore = Math.max(15, Math.min(70, Math.round(900 / Math.max(15, cpuMs))));
      const memoryBonus = typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
        ? Math.min(20, Math.round(((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0) * 2))
        : 0;
      const coresBonus = typeof navigator.hardwareConcurrency === 'number'
        ? Math.min(15, Math.round(navigator.hardwareConcurrency / 2))
        : 0;

      const score = Math.max(5, Math.min(100, cpuScore + gpuScore + memoryBonus + coresBonus - (gpuAvailable ? 0 : 25)));
      const supportedIds = MODEL_OPTIONS
        .map(model => model.id)
        .filter(id => runtimeModelSupport[id] ?? true);
      const allowedIds = supportedIds.length > 0 ? supportedIds : MODEL_OPTIONS.map(model => model.id);
      const recommendation = chooseBenchmarkRecommendation(score, allowedIds);

      const result: BenchmarkResult = {
        ranAt: Date.now(),
        score,
        cpuScore,
        gpuScore,
        tier: recommendation.tier,
        recommendedModelId: recommendation.modelId,
        notes: [
          `CPU loop completed in ${cpuMs.toFixed(0)}ms`,
          gpuAvailable ? 'WebGPU detected' : 'WebGPU not detected',
          recommendation.tier === 'low' ? 'Recommend lightweight model for smooth experience.' : 'Device can handle stronger models.',
        ],
      };

      setBenchmarkResult(result);
      await saveSetting(SETTINGS_KEY.benchmarkResult, JSON.stringify(result));

      return result;
    } finally {
      setIsBenchmarkRunning(false);
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
    setBenchmarkResult(null);
    await saveSetting(SETTINGS_KEY.benchmarkResult, '');
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
    runtimeCompatibility,

    benchmarkResult,
    isBenchmarkRunning,

    appSettings,
    downloadedPackIds,

    availableModels: MODEL_OPTIONS,
    cachedModelStatus: cachedModelStatuses.data ?? {},
    runtimeModelSupport,

    loadModel,
    unloadModel,
    runOnboardingBenchmark,

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
