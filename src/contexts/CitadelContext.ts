import { createContext, useContext } from 'react';

import type { MLCEngineInterface } from '@/lib/webllm-client';
import type { ModelOption } from '@/lib/webllm-models';

export interface LoadProgress {
  progress: number;
  text: string;
  timeElapsed: number;
}

export interface CitadelMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  runtimeStats?: string;
}

export interface CitadelChatResponse {
  text: string;
  runtimeStats: string;
}

export const DEFAULT_ASSISTANT_SYSTEM_PROMPT = [
  'Keep answers concise but detailed.',
  'Add a confidence score at the end of every response in this exact format: Confidence: X%',
  '100% is full confidence, and 0% is no confidence.',
].join('\n');

export interface CitadelAppSettings {
  selectedModelId: string;
  setupComplete: boolean;
  autoLoadModel: boolean;
  systemPrompt: string;
}

export type BrowserKind = 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'other';

export interface RuntimeCompatibility {
  browser: BrowserKind;
  browserVersion: string | null;
  status: 'supported' | 'limited' | 'unsupported';
  webGpuSupported: boolean;
  secureContext: boolean;
  hardwareConcurrency: number | null;
  deviceMemoryGB: number | null;
  headline: string;
  detail: string;
  recommendations: string[];
}

export interface BenchmarkResult {
  ranAt: number;
  score: number;
  cpuScore: number;
  gpuScore: number;
  tier: 'low' | 'medium' | 'high' | 'ultra';
  recommendedModelId: string;
  notes: string[];
}

export interface CitadelContextType {
  engine: MLCEngineInterface | null;
  isEngineReady: boolean;
  isLoadingEngine: boolean;
  engineError: string | null;
  currentModelId: string | null;
  loadProgress: LoadProgress;

  isOnline: boolean;
  hasWebGpu: boolean;
  runtimeCompatibility: RuntimeCompatibility;

  benchmarkResult: BenchmarkResult | null;
  isBenchmarkRunning: boolean;

  appSettings: CitadelAppSettings;
  downloadedPackIds: string[];

  availableModels: ModelOption[];
  cachedModelStatus: Record<string, boolean>;
  runtimeModelSupport: Record<string, boolean>;

  loadModel: (modelId: string) => Promise<void>;
  unloadModel: () => Promise<void>;
  runOnboardingBenchmark: () => Promise<BenchmarkResult>;

  sendMessage: (input: {
    userMessage: string;
    history: CitadelMessage[];
    useKnowledge: boolean;
    onToken?: (token: string) => void;
  }) => Promise<CitadelChatResponse>;

  installKnowledgePack: (packId: string) => Promise<void>;
  removeKnowledgePack: (packId: string) => Promise<void>;
  refreshKnowledgePacks: () => Promise<void>;

  saveSettings: (partial: Partial<CitadelAppSettings>) => Promise<void>;
  completeInitialSetup: (payload: {
    selectedModelId: string;
    packIds: string[];
    autoLoadModel: boolean;
  }) => Promise<void>;

  getStorageInfo: () => Promise<{ usedBytes: number; quotaBytes: number } | null>;
  resetApplicationData: () => Promise<void>;
}

export const CitadelContext = createContext<CitadelContextType | undefined>(undefined);

export function useCitadel(): CitadelContextType {
  const context = useContext(CitadelContext);
  if (!context) {
    throw new Error('useCitadel must be used inside CitadelProvider');
  }

  return context;
}
