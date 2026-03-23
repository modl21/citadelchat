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

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    description: 'Ultra-light and extremely fast. Best for very low-end devices and simple Q&A.',
    sizeLabel: '~420 MB',
    sizeBytes: 420_000_000,
    speed: 'very-fast',
    quality: 'basic',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    description: 'Great starter model with strong speed and improved answer quality.',
    sizeLabel: '~900 MB',
    sizeBytes: 900_000_000,
    speed: 'fast',
    quality: 'good',
    recommended: true,
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B',
    description: 'Compact but capable model. Good response quality while staying efficient.',
    sizeLabel: '~1.1 GB',
    sizeBytes: 1_100_000_000,
    speed: 'fast',
    quality: 'good',
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
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    description: 'Higher-quality answers and better long-form responses. Requires more memory.',
    sizeLabel: '~2.3 GB',
    sizeBytes: 2_300_000_000,
    speed: 'balanced',
    quality: 'excellent',
    recommended: true,
  },
  {
    id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 3B',
    description: 'Excellent all-around model with stronger technical reasoning.',
    sizeLabel: '~2.4 GB',
    sizeBytes: 2_400_000_000,
    speed: 'balanced',
    quality: 'excellent',
  },
  {
    id: 'Qwen3-1.7B-q4f16_1-MLC',
    name: 'Qwen 3 1.7B',
    description: 'Qwen 3 generation with faster responses and stronger reasoning than tiny models.',
    sizeLabel: '~1.4 GB',
    sizeBytes: 1_400_000_000,
    speed: 'fast',
    quality: 'excellent',
  },
  {
    id: 'Qwen3-4B-q4f16_1-MLC',
    name: 'Qwen 3 4B',
    description: 'High-quality Qwen 3 option with strong instruction following and technical depth.',
    sizeLabel: '~3.2 GB',
    sizeBytes: 3_200_000_000,
    speed: 'slow',
    quality: 'excellent',
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

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const scaled = bytes / 1024 ** power;

  return `${scaled.toFixed(scaled >= 10 ? 0 : 1)} ${units[power]}`;
}
