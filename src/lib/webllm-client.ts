import {
  CreateMLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
  prebuiltAppConfig,
  type AppConfig as WebLlmAppConfig,
  type ChatCompletionMessageParam,
  type ChatCompletionChunk,
  type InitProgressReport,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';

export type {
  WebLlmAppConfig,
  ChatCompletionMessageParam,
  ChatCompletionChunk,
  InitProgressReport,
  MLCEngineInterface,
};

export interface WebLLMModule {
  prebuiltAppConfig: WebLlmAppConfig;
  CreateMLCEngine: typeof CreateMLCEngine;
  hasModelInCache: typeof hasModelInCache;
  deleteModelAllInfoInCache: typeof deleteModelAllInfoInCache;
}

const webllmModule: WebLLMModule = {
  prebuiltAppConfig,
  CreateMLCEngine,
  hasModelInCache,
  deleteModelAllInfoInCache,
};

export async function loadWebLLMModule(): Promise<WebLLMModule> {
  return webllmModule;
}
