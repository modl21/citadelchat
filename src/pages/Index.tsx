import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock3,
  Download,
  HardDrive,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useSeoMeta } from '@unhead/react';

import {
  DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  useCitadel,
  type BrowserKind,
  type CitadelMessage,
} from '@/contexts/CitadelContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from '@/hooks/useToast';
import { useTheme } from '@/hooks/useTheme';
import { SetupWizard } from '@/components/SetupWizard';
import { useIsMobile } from '@/hooks/useIsMobile';
import { KNOWLEDGE_PACKS } from '@/lib/knowledge-packs';
import { filterModelsForDevice, formatBytes } from '@/lib/webllm-models';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const INITIAL_MESSAGE: CitadelMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'you are offline but have full knowledge pack access, ask anything to get started',
  createdAt: Date.now(),
};

type AppView = 'chat' | 'library' | 'history' | 'settings';

interface NavItem {
  id: AppView;
  label: string;
  icon: LucideIcon;
}

interface SavedChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: CitadelMessage[];
  useKnowledge: boolean;
}

type DeviceClass = 'mobile' | 'desktop';

interface InstallGuide {
  title: string;
  steps: string[];
}

const MAX_CHAT_HISTORY = 50;

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'chat', icon: MessageSquare },
  { id: 'library', label: 'library', icon: HardDrive },
  { id: 'history', label: 'history', icon: Clock3 },
  { id: 'settings', label: 'settings', icon: Settings },
];

function hasMeaningfulMessages(messages: CitadelMessage[]): boolean {
  const nonWelcome = messages.filter(message => message.id !== INITIAL_MESSAGE.id);
  return nonWelcome.some(message => message.content.trim().length > 0);
}

function buildSessionTitle(messages: CitadelMessage[]): string {
  const firstUserMessage = messages.find(message => message.role === 'user' && message.content.trim().length > 0);
  if (!firstUserMessage) {
    return 'untitled chat';
  }

  const compact = firstUserMessage.content.trim().replace(/\s+/g, ' ');
  if (compact.length <= 72) {
    return compact;
  }

  return `${compact.slice(0, 72)}…`;
}

function upsertSession(sessions: SavedChatSession[], entry: SavedChatSession): SavedChatSession[] {
  const merged = [entry, ...sessions.filter(session => session.id !== entry.id)]
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return merged.slice(0, MAX_CHAT_HISTORY);
}

function formatSessionTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInstallGuidance(device: DeviceClass, browser: BrowserKind): InstallGuide {
  if (device === 'mobile') {
    if (browser === 'safari') {
      return {
        title: 'iPhone / iPad (Safari)',
        steps: [
          'Tap the Share button in Safari.',
          'Scroll down and tap Add to Home Screen.',
          'Tap Add to install Citadel Chat on your home screen.',
        ],
      };
    }

    if (browser === 'chrome' || browser === 'edge' || browser === 'opera') {
      return {
        title: 'Android (browser menu)',
        steps: [
          'Open the browser menu (⋮ or …).',
          'Tap Install app or Add to Home screen.',
          'Confirm Install to save Citadel Chat offline as an app.',
        ],
      };
    }

    return {
      title: 'Mobile browser',
      steps: [
        'Open your browser menu.',
        'Choose Install app or Add to Home screen.',
        'Confirm to install Citadel Chat for offline use.',
      ],
    };
  }

  if (browser === 'chrome' || browser === 'edge' || browser === 'opera') {
    return {
      title: 'Desktop install',
      steps: [
        'Look for the install icon in the address bar.',
        'Or open the browser menu and choose Install Citadel Chat.',
        'Confirm Install to launch it as a standalone app.',
      ],
    };
  }

  if (browser === 'safari') {
    return {
      title: 'Desktop Safari',
      steps: [
        'Open File in the Safari menu bar.',
        'Choose Add to Dock.',
        'Confirm to save Citadel Chat as a web app for offline access.',
      ],
    };
  }

  return {
    title: 'Desktop browser',
    steps: [
      'Open your browser menu.',
      'Find Install app, Add to apps, or Create shortcut.',
      'Enable opening as an app and confirm installation.',
    ],
  };
}

export default function Index() {
  useSeoMeta({
    title: 'Citadel Chat',
    description: 'Offline-first local AI assistant with downloadable knowledge packs and browser-local inference.',
  });

  const {
    appSettings,
    availableModels,
    cachedModelStatus,
    currentModelId,
    downloadedPackIds,
    engineError,
    getStorageInfo,
    installKnowledgePack,
    isEngineReady,
    isLoadingEngine,
    loadModel,
    loadProgress,
    removeKnowledgePack,
    resetApplicationData,
    runtimeCompatibility,
    saveSettings,
    sendMessage,
  } = useCitadel();

  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  const [setupCompletedState, setSetupCompletedState] = useState(appSettings.setupComplete);
  const [view, setView] = useState<AppView>('chat');

  const [messages, setMessages] = useState<CitadelMessage[]>([INITIAL_MESSAGE]);
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [systemPromptDraft, setSystemPromptDraft] = useState(appSettings.systemPrompt);
  const [isSavingSystemPrompt, setIsSavingSystemPrompt] = useState(false);

  const [chatHistory, setChatHistory] = useLocalStorage<SavedChatSession[]>('citadel:chat-history', []);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const [installingPackIds, setInstallingPackIds] = useState<string[]>([]);
  const [isInstallingRecommended, setIsInstallingRecommended] = useState(false);

  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);

  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallingPwa, setIsInstallingPwa] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  );
  const [isRefreshingOfflineCache, setIsRefreshingOfflineCache] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSetupCompletedState(appSettings.setupComplete);
  }, [appSettings.setupComplete]);

  useEffect(() => {
    setSystemPromptDraft(appSettings.systemPrompt);
  }, [appSettings.systemPrompt]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, [prompt]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!activeChatId || isSending) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextSession: SavedChatSession = {
        id: activeChatId,
        title: buildSessionTitle(messages),
        updatedAt: Date.now(),
        messages,
        useKnowledge,
      };

      setChatHistory(current => upsertSession(current, nextSession));
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeChatId, isSending, messages, setChatHistory, useKnowledge]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredInstallPrompt(null);
      toast({
        title: 'App installed',
        description: 'Citadel Chat is now available from your home screen or app launcher.',
      });
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setIsPwaInstalled(mediaQuery.matches);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const setupIsComplete = setupCompletedState && appSettings.setupComplete;

  const installedPacks = useMemo(
    () => KNOWLEDGE_PACKS.filter(pack => downloadedPackIds.includes(pack.id)),
    [downloadedPackIds],
  );

  const availablePacks = useMemo(
    () => KNOWLEDGE_PACKS.filter(pack => !downloadedPackIds.includes(pack.id)),
    [downloadedPackIds],
  );

  const recommendedAvailablePacks = useMemo(
    () => availablePacks.filter(pack => pack.recommended),
    [availablePacks],
  );

  const modelsToOffer = useMemo(
    () => filterModelsForDevice(availableModels, isMobile),
    [availableModels, isMobile],
  );

  const deviceClass: DeviceClass = isMobile ? 'mobile' : 'desktop';
  const installGuide = useMemo(
    () => getInstallGuidance(deviceClass, runtimeCompatibility.browser),
    [deviceClass, runtimeCompatibility.browser],
  );
  const browserLabel = runtimeCompatibility.browser === 'other' ? 'unknown' : runtimeCompatibility.browser;

  const normalizedSystemPromptDraft = systemPromptDraft.trim();
  const normalizedSavedSystemPrompt = appSettings.systemPrompt.trim();
  const hasSystemPromptChanges = normalizedSystemPromptDraft !== normalizedSavedSystemPrompt;
  const canSaveSystemPrompt = normalizedSystemPromptDraft.length > 0 && hasSystemPromptChanges;

  if (!setupIsComplete) {
    return <SetupWizard onComplete={() => setSetupCompletedState(true)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isLoadingEngine && (
        <div className="fixed inset-x-0 top-0 z-50 h-px bg-border/60">
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
          />
        </div>
      )}

      <main className="mx-auto min-h-screen w-full max-w-5xl px-5 pb-24 pt-6 md:px-8 md:pt-8">
        {view === 'chat' && (
          <section className="flex min-h-[calc(100vh-9rem)] flex-col">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-base font-semibold tracking-tight">chat</h1>
              <Button variant="outline" size="sm" onClick={() => void handleStartNewChat()}>
                <Plus className="mr-2 size-4" />
                new chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-8 pb-6">
                {messages.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messageEndRef} />
              </div>
            </div>

            <form
              className="pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
            >
              {engineError && (
                <p className="mb-2 text-xs text-destructive">{engineError}</p>
              )}

              {isLoadingEngine && (
                <p className="mb-2 text-xs font-mono text-muted-foreground">{loadProgress.text}</p>
              )}

              <div className="relative">
                <textarea
                  ref={composerRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={isEngineReady ? 'ask anything' : 'load a model in settings to begin'}
                  disabled={!isEngineReady || isSending}
                  rows={1}
                  className="w-full resize-none overflow-y-auto border-0 border-b border-border bg-transparent px-0 py-3 pr-10 text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground/75 focus:border-primary disabled:cursor-not-allowed disabled:opacity-55"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={!prompt.trim() || isSending || !isEngineReady}
                  aria-label="Send"
                  className={cn(
                    'absolute bottom-2 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-primary transition-opacity duration-100 ease-out disabled:pointer-events-none disabled:text-muted-foreground/40',
                    prompt.trim() ? 'opacity-100' : 'pointer-events-none opacity-0',
                  )}
                >
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          </section>
        )}

        {view === 'library' && (
          <section className="space-y-10">
            <div>
              <h1 className="text-base font-semibold tracking-tight">library</h1>
              <p className="mt-2 text-sm text-muted-foreground">manage downloaded packs and install additional offline knowledge quickly.</p>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">available to download</h2>
                {recommendedAvailablePacks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isInstallingRecommended}
                    onClick={() => {
                      void handleInstallRecommendedPacks();
                    }}
                  >
                    {isInstallingRecommended ? 'downloading…' : 'download recommended'}
                  </Button>
                )}
              </div>

              {availablePacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">all bundled packs are already installed.</p>
              ) : (
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {availablePacks.map(pack => {
                    const isInstallingThisPack = installingPackIds.includes(pack.id);

                    return (
                      <li key={pack.id} className="py-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium text-foreground">{pack.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{pack.description}</p>
                            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                              {pack.sizeLabel} · {pack.docCount} docs
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isInstallingThisPack}
                            onClick={() => {
                              void handleInstallPack(pack.id);
                            }}
                          >
                            {isInstallingThisPack ? 'downloading…' : 'download'}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold">installed packs</h2>

              {installedPacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">no packs installed yet.</p>
              ) : (
                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {installedPacks.map(pack => (
                    <li key={pack.id} className="py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-foreground">{pack.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{pack.description}</p>
                          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                            {pack.sizeLabel} · {pack.docCount} docs
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeKnowledgePack(pack.id)}
                          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
                        >
                          remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>
        )}

        {view === 'history' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-semibold tracking-tight">chat history</h1>
                <p className="mt-2 text-sm text-muted-foreground">select any saved conversation to continue where you left off.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void handleStartNewChat()}>
                <Plus className="mr-2 size-4" />
                new chat
              </Button>
            </div>

            {chatHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">no saved chats yet. start a chat and press new chat to save it here.</p>
            ) : (
              <ul className="divide-y divide-border/70 border-y border-border/70">
                {chatHistory.map(session => (
                  <li key={session.id} className={cn('py-4', session.id === activeChatId && 'bg-foreground/[0.03]')}>
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryChat(session.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-foreground">{session.title}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {formatSessionTime(session.updatedAt)} · {session.messages.filter(message => message.role === 'user').length} prompts
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHistoryChat(session.id)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-destructive"
                        aria-label="Delete chat history item"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {view === 'settings' && (
          <section>
            <h1 className="text-base font-semibold tracking-tight">settings</h1>

            <div className="mt-10 space-y-12">
              <section className="space-y-4">
                <h2 className="text-sm font-semibold">install app</h2>
                <p className="text-xs text-muted-foreground">
                  install citadel chat on desktop or mobile as a standalone offline-ready app.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInstallingPwa || isPwaInstalled}
                  onClick={() => {
                    void handleInstallPwa();
                  }}
                >
                  <Download className="mr-2 size-4" />
                  {isPwaInstalled ? 'already installed' : isInstallingPwa ? 'opening install prompt…' : 'install citadel chat'}
                </Button>
                {!deferredInstallPrompt && !isPwaInstalled && (
                  <p className="text-[11px] text-muted-foreground">
                    if no prompt appears, use your browser menu and choose install app or add to home screen.
                  </p>
                )}

                {!isPwaInstalled && (
                  <div className="space-y-3 rounded-lg border border-border/70 bg-foreground/[0.02] px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      detected: {deviceClass} · {browserLabel}
                    </p>
                    <p className="text-sm font-medium">{installGuide.title}</p>
                    <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                      {installGuide.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isRefreshingOfflineCache}
                  onClick={() => {
                    void handleRefreshOfflineCache();
                  }}
                >
                  <RefreshCw className={cn('mr-2 size-4', isRefreshingOfflineCache && 'animate-spin')} />
                  {isRefreshingOfflineCache ? 'refreshing offline cache…' : 'refresh offline cache'}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  refresh offline cache after updates to keep this install fully usable without network.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-semibold">interface</h2>
                <div className="flex items-center justify-between border-b border-border/70 py-3">
                  <div>
                    <p className="text-sm">dark mode</p>
                    <p className="text-xs text-muted-foreground">Default operating theme for low-light use.</p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    aria-label="Toggle dark mode"
                  />
                </div>
                <div className="flex items-center justify-between border-b border-border/70 py-3">
                  <div>
                    <p className="text-sm">use knowledge packs in chat</p>
                    <p className="text-xs text-muted-foreground">When off, responses are model-only with no local pack retrieval.</p>
                  </div>
                  <Switch
                    checked={useKnowledge}
                    onCheckedChange={setUseKnowledge}
                    aria-label="Toggle knowledge packs in chat"
                  />
                </div>
                <div className="flex items-center justify-between border-b border-border/70 py-3">
                  <div>
                    <p className="text-sm">auto-load model on startup</p>
                    <p className="text-xs text-muted-foreground">Load selected model automatically after launch.</p>
                  </div>
                  <Switch
                    checked={appSettings.autoLoadModel}
                    onCheckedChange={(checked) => {
                      void saveSettings({ autoLoadModel: checked });
                    }}
                    aria-label="Toggle auto-load model"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-semibold">assistant behavior</h2>
                <p className="text-xs text-muted-foreground">
                  This system prompt is applied to all loaded models.
                </p>
                <div className="space-y-3 border-y border-border/70 py-4">
                  <Textarea
                    value={systemPromptDraft}
                    onChange={(event) => setSystemPromptDraft(event.target.value)}
                    className="min-h-[168px] text-sm leading-6"
                    aria-label="System prompt"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      disabled={!canSaveSystemPrompt || isSavingSystemPrompt}
                      onClick={() => {
                        void handleSaveSystemPrompt();
                      }}
                    >
                      {isSavingSystemPrompt ? 'saving…' : 'save prompt'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSavingSystemPrompt || systemPromptDraft === DEFAULT_ASSISTANT_SYSTEM_PROMPT}
                      onClick={() => setSystemPromptDraft(DEFAULT_ASSISTANT_SYSTEM_PROMPT)}
                    >
                      reset to default
                    </Button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-semibold">models</h2>
                <p className="text-xs text-muted-foreground">
                  {runtimeCompatibility.headline}. {runtimeCompatibility.detail}
                </p>
                {isMobile && (
                  <p className="text-xs text-muted-foreground">more powerful models available on desktop</p>
                )}
                {engineError && <p className="text-xs text-destructive">{engineError}</p>}

                <ul className="divide-y divide-border/70 border-y border-border/70">
                  {modelsToOffer.map(model => {
                    const active = model.id === (currentModelId ?? appSettings.selectedModelId);
                    const cached = cachedModelStatus[model.id];

                    return (
                      <li key={model.id} className={cn('py-4', active && 'bg-foreground/[0.03]')}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{model.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
                            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                              {model.id} · {model.sizeLabel} · {model.speed} · {model.quality}
                              {cached ? ' · cached' : ''}
                            </p>
                          </div>
                          <Button
                            variant={active ? 'secondary' : 'outline'}
                            size="sm"
                            disabled={isLoadingEngine}
                            onClick={() => void loadModel(model.id)}
                            className="shrink-0"
                          >
                            {active ? 'active' : 'load'}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-semibold">storage</h2>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingStorage}
                  onClick={() => {
                    setLoadingStorage(true);
                    void getStorageInfo()
                      .then(setStorageUsage)
                      .finally(() => setLoadingStorage(false));
                  }}
                >
                  {loadingStorage ? 'checking…' : 'check local usage'}
                </Button>

                {storageUsage && (
                  <p className="font-mono text-[12px] text-muted-foreground">
                    used {formatBytes(storageUsage.usedBytes)} / quota {formatBytes(storageUsage.quotaBytes)}
                  </p>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-semibold">reset</h2>
                <p className="text-xs text-muted-foreground">Remove local model cache, downloaded packs, and saved settings from this browser.</p>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">reset all local data</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Citadel Chat?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This clears all model caches, knowledge packs, and saved settings from this browser.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void resetApplicationData();
                        }}
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </div>

            <footer className="mt-16 pb-4 text-xs text-muted-foreground/80">
              <a href="https://shakespeare.diy" target="_blank" rel="noreferrer" className="underline underline-offset-4">
                Vibed with Shakespeare
              </a>
            </footer>
          </section>
        )}
      </main>

      <BottomNav view={view} onViewChange={setView} />
    </div>
  );

  async function handleStartNewChat() {
    let saved = false;

    if (hasMeaningfulMessages(messages)) {
      const sessionId = activeChatId ?? crypto.randomUUID();
      const session: SavedChatSession = {
        id: sessionId,
        title: buildSessionTitle(messages),
        updatedAt: Date.now(),
        messages,
        useKnowledge,
      };

      setChatHistory(current => upsertSession(current, session));
      saved = true;
    }

    setMessages([INITIAL_MESSAGE]);
    setPrompt('');
    setActiveChatId(null);
    setView('chat');

    if (saved) {
      toast({
        title: 'Chat saved',
        description: 'Current conversation was saved to history.',
      });
    }
  }

  function handleOpenHistoryChat(sessionId: string) {
    const target = chatHistory.find(session => session.id === sessionId);
    if (!target) {
      return;
    }

    setActiveChatId(target.id);
    setMessages(target.messages.length > 0 ? target.messages : [INITIAL_MESSAGE]);
    setUseKnowledge(target.useKnowledge);
    setPrompt('');
    setView('chat');
  }

  function handleDeleteHistoryChat(sessionId: string) {
    setChatHistory(current => current.filter(session => session.id !== sessionId));

    if (activeChatId === sessionId) {
      setActiveChatId(null);
      setMessages([INITIAL_MESSAGE]);
      setPrompt('');
    }
  }

  async function handleInstallPack(packId: string) {
    if (installingPackIds.includes(packId)) {
      return;
    }

    setInstallingPackIds(current => [...current, packId]);

    try {
      await installKnowledgePack(packId);
      toast({
        title: 'Pack downloaded',
        description: 'Knowledge pack is now available offline.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download knowledge pack.';
      toast({
        title: 'Download failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setInstallingPackIds(current => current.filter(id => id !== packId));
    }
  }

  async function handleInstallRecommendedPacks() {
    if (isInstallingRecommended || recommendedAvailablePacks.length === 0) {
      return;
    }

    setIsInstallingRecommended(true);

    try {
      for (const pack of recommendedAvailablePacks) {
        // eslint-disable-next-line no-await-in-loop
        await installKnowledgePack(pack.id);
      }

      toast({
        title: 'Recommended packs downloaded',
        description: 'Recommended knowledge packs are now available offline.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download recommended packs.';
      toast({
        title: 'Download failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsInstallingRecommended(false);
    }
  }

  async function handleInstallPwa() {
    if (isPwaInstalled || isInstallingPwa) {
      return;
    }

    if (!deferredInstallPrompt) {
      toast({
        title: 'Install prompt unavailable',
        description: 'Open your browser menu and choose install app or add to home screen.',
      });
      return;
    }

    setIsInstallingPwa(true);

    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
        toast({
          title: 'Install started',
          description: 'Citadel Chat is being installed on this device.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open install prompt.';
      toast({
        title: 'Install failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeferredInstallPrompt(null);
      setIsInstallingPwa(false);
    }
  }

  async function handleRefreshOfflineCache() {
    if (isRefreshingOfflineCache) {
      return;
    }

    setIsRefreshingOfflineCache(true);

    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service worker is not available in this browser.');
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('Service worker is not registered yet. Reload and try again.');
      }

      await registration.update();

      await Promise.all(
        KNOWLEDGE_PACKS.map(pack => fetch(pack.filePath, { cache: 'reload' }).catch(() => null)),
      );

      const worker = registration.waiting ?? registration.active;
      const readySignal = new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(() => resolve(), 2000);

        const handleMessage = (event: MessageEvent) => {
          const data = event.data as { type?: string } | null;
          if (!data || (data.type !== 'CACHE_READY' && data.type !== 'CACHE_ERROR')) {
            return;
          }

          window.clearTimeout(timeoutId);
          navigator.serviceWorker.removeEventListener('message', handleMessage);
          resolve();
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);
      });

      if (worker) {
        worker.postMessage({ type: 'CACHE_KNOWLEDGE_PACKS' });
        await readySignal;
      }

      toast({
        title: 'Offline cache refreshed',
        description: 'Latest app assets and knowledge packs are now cached for offline use.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Offline cache refresh failed.';
      toast({
        title: 'Cache refresh failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingOfflineCache(false);
    }
  }

  async function handleSaveSystemPrompt() {
    if (!normalizedSystemPromptDraft || isSavingSystemPrompt || !hasSystemPromptChanges) {
      return;
    }

    setIsSavingSystemPrompt(true);

    try {
      await saveSettings({ systemPrompt: normalizedSystemPromptDraft });
      toast({
        title: 'Prompt saved',
        description: 'System prompt updated for all models.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save system prompt.';
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingSystemPrompt(false);
    }
  }

  async function handleSend() {
    const trimmed = prompt.trim();
    if (!trimmed || isSending) {
      return;
    }

    if (!isEngineReady) {
      setMessages(current => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Local model is not ready yet. Load a model in settings to continue.',
          createdAt: Date.now(),
        },
      ]);
      return;
    }

    const userMessage: CitadelMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: CitadelMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    setPrompt('');
    setMessages(current => [...current, userMessage, assistantMessage]);

    if (!activeChatId) {
      setActiveChatId(crypto.randomUUID());
    }

    setIsSending(true);

    try {
      const result = await sendMessage({
        userMessage: trimmed,
        history: [...messages, userMessage],
        useKnowledge,
        onToken: (token) => {
          setMessages(current =>
            current.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: `${msg.content}${token}` }
                : msg,
            ),
          );
        },
      });

      setMessages(current =>
        current.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: result.text, runtimeStats: result.runtimeStats }
            : msg,
        ),
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      setMessages(current =>
        current.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: `Error: ${message}` }
            : msg,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }
}

function BottomNav({
  view,
  onViewChange,
}: {
  view: AppView;
  onViewChange: (view: AppView) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = view === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[11px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={item.label}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MessageBubble({ message }: { message: CitadelMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('animate-message-in flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[min(72ch,88%)]', isUser && 'rounded-xl bg-foreground/[0.05] px-4 py-3')}>
        <div className={cn('whitespace-pre-wrap break-words text-[15px] leading-7', !isUser && 'prose-citadel')}>
          {message.content || <span className="typing-cursor">thinking</span>}
        </div>
        {message.runtimeStats && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{message.runtimeStats}</p>
        )}
      </div>
    </div>
  );
}
