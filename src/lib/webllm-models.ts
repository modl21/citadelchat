/** Available models for local inference via WebLLM */
export interface ModelOption {
  id: string;
  name: string;
  description: string;
  sizeLabel: string;
  sizeBytes: number;
  speed: 'very-fast' | 'fast' | 'balanced' | 'slow';
  quality: 'basic' | 'good' | 'excellent';
  recommended?: boolean;
}

export const MOBILE_MODEL_IDS = [
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
] as const;

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B',
    description: 'Smallest and fastest model. Ideal for low-end devices and quick responses.',
    sizeLabel: '~650 MB',
    sizeBytes: 650_000_000,
    speed: 'very-fast',
    quality: 'basic',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B',
    description: 'Strong multilingual model with good reasoning and coding performance.',
    sizeLabel: '~1.2 GB',
    sizeBytes: 1_200_000_000,
    speed: 'fast',
    quality: 'good',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B',
    description: 'Reliable instruction-following model with balanced speed and quality.',
    sizeLabel: '~1.6 GB',
    sizeBytes: 1_600_000_000,
    speed: 'balanced',
    quality: 'good',
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B',
    description: 'Excellent all-around model with stronger technical reasoning.',
    sizeLabel: '~2.4 GB',
    sizeBytes: 2_400_000_000,
    speed: 'balanced',
    quality: 'excellent',
    recommended: true,
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    description: 'Advanced compact model with high reasoning quality and coding strength.',
    sizeLabel: '~2.8 GB',
    sizeBytes: 2_800_000_000,
    speed: 'slow',
    quality: 'excellent',
  },
];

export function getModelById(id: string): ModelOption | undefined {
  return MODEL_OPTIONS.find(model => model.id === id);
}

export function filterModelsForDevice(models: ModelOption[], isMobile: boolean): ModelOption[] {
  if (!isMobile) {
    return models;
  }

  const mobileIds = new Set<string>(MOBILE_MODEL_IDS);
  return models.filter(model => mobileIds.has(model.id));
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const scaled = bytes / 1024 ** power;

  return `${scaled.toFixed(scaled >= 10 ? 0 : 1)} ${units[power]}`;
}
