import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { Download, HardDrive, Menu, MessageSquare, Send, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useSeoMeta } from '@unhead/react';

import { useCitadel, type CitadelMessage } from '@/contexts/CitadelContext';
import { toast } from '@/hooks/useToast';
import { useTheme } from '@/hooks/useTheme';
import { SetupWizard } from '@/components/SetupWizard';
import { KNOWLEDGE_PACKS } from '@/lib/knowledge-packs';
import { formatBytes } from '@/lib/webllm-models';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
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

const OFFLINE_EXPORT_FILES = [
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/_redirects',
  '/robots.txt',
  '/citadel-logo.jpg',
  '/citadel-logo.png',
  '/odell-badge.jpg',
  '/knowledge-packs/emergency-medical.json',
  '/knowledge-packs/water-food.json',
  '/knowledge-packs/comms-navigation.json',
  '/knowledge-packs/field-engineering.json',
  '/knowledge-packs/long-term-agriculture.json',
  '/knowledge-packs/off-grid-medicine.json',
  '/knowledge-packs/cbrn-survival.json',
  '/knowledge-packs/trade-barter.json',
  '/knowledge-packs/firearms-weapons.json',
  '/knowledge-packs/perimeter-defense.json',
  '/knowledge-packs/mechanical-repair.json',
  '/knowledge-packs/fuel-heat-cooking.json',
  '/knowledge-packs/water-systems.json',
] as const;

const INITIAL_MESSAGE: CitadelMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Citadel Chat is online locally. Ask anything from your downloaded packs or run general local AI chat.',
  createdAt: Date.now(),
};

type AppView = 'chat' | 'library' | 'settings';

interface NavItem {
  id: AppView;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'library', label: 'Library', icon: HardDrive },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const OFFLINE_BOOTSTRAP_SNIPPET = `<script>
(() => {
  if (window.location.protocol !== 'file:') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      const relativePath = '.' + input;
      return originalFetch(new URL(relativePath, window.location.href).toString(), init);
    }

    return originalFetch(input, init);
  };
})();
</script>`;

function toOfflineRelativePath(path: string): string {
  if (path.startsWith('./')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `.${path}`;
  }

  return path;
}

function injectOfflineBootstrap(indexHtml: string): string {
  const withRelativePaths = indexHtml.replace(/(src|href)=["'](\/(?!\/)[^"']*)["']/g, (_match, attr, path) => {
    return `${attr}="${toOfflineRelativePath(path)}"`;
  });

  if (withRelativePaths.includes(OFFLINE_BOOTSTRAP_SNIPPET)) {
    return withRelativePaths;
  }

  if (withRelativePaths.includes('</head>')) {
    return withRelativePaths.replace('</head>', `  ${OFFLINE_BOOTSTRAP_SNIPPET}\n  </head>`);
  }

  return `${OFFLINE_BOOTSTRAP_SNIPPET}\n${withRelativePaths}`;
}

function replaceQuotedAbsolutePath(content: string, absolutePrefix: string): string {
  const escaped = absolutePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const relative = `./${absolutePrefix.slice(1)}`;

  return content
    .replace(new RegExp(`"${escaped}`, 'g'), `"${relative}`)
    .replace(new RegExp(`'${escaped}`, 'g'), `'${relative}`);
}

function rewriteTextAssetForOffline(content: string, filePath: string): string {
  if (filePath.endsWith('manifest.webmanifest')) {
    try {
      const manifest = JSON.parse(content) as {
        start_url?: string;
        scope?: string;
      };

      manifest.start_url = './index.html';
      manifest.scope = './';

      return `${JSON.stringify(manifest, null, 2)}\n`;
    } catch {
      return content;
    }
  }

  let rewritten = content;
  const prefixes = [
    '/knowledge-packs/',
    '/manifest.webmanifest',
    '/sw.js',
    '/citadel-logo.jpg',
    '/citadel-logo.png',
    '/odell-badge.jpg',
    '/main-',
    '/shakespeare_tailwind.config-',
    '/index.html',
    '/robots.txt',
    '/_redirects',
    '/assets/',
  ];

  for (const prefix of prefixes) {
    rewritten = replaceQuotedAbsolutePath(rewritten, prefix);
  }

  return rewritten;
}

function extractAssetPathsFromIndex(indexHtml: string): string[] {
  const matches = [...indexHtml.matchAll(/(?:src|href)=["'](\/(?!\/)[^"']+)["']/g)];
  const unique = new Set<string>();

  for (const match of matches) {
    const path = match[1];
    if (!path.startsWith('/@')) {
      unique.add(path);
    }
  }

  return Array.from(unique);
}

function isTextAsset(contentType: string | null, filePath: string): boolean {
  if (!contentType) {
    return /\.(html|js|css|json|txt|webmanifest|map)$/i.test(filePath);
  }

  return (
    contentType.includes('text/')
    || contentType.includes('javascript')
    || contentType.includes('json')
    || contentType.includes('xml')
    || contentType.includes('svg')
  );
}

function normalizeAssetPath(path: string): string {
  const clean = path.split('#')[0].split('?')[0];
  if (clean.startsWith('/')) return clean;
  if (clean.startsWith('./')) return `/${clean.slice(2)}`;
  return `/${clean}`;
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

  const [setupCompletedState, setSetupCompletedState] = useState(appSettings.setupComplete);
  const [view, setView] = useState<AppView>('chat');
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  const [messages, setMessages] = useState<CitadelMessage[]>([INITIAL_MESSAGE]);
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [useKnowledge, setUseKnowledge] = useState(true);

  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [isExportingOfflineBundle, setIsExportingOfflineBundle] = useState(false);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSetupCompletedState(appSettings.setupComplete);
  }, [appSettings.setupComplete]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, [prompt]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const setupIsComplete = setupCompletedState && appSettings.setupComplete;

  const installedPacks = useMemo(
    () => KNOWLEDGE_PACKS.filter(pack => downloadedPackIds.includes(pack.id)),
    [downloadedPackIds],
  );

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

      <div className="flex min-h-screen">
        <aside className="hidden w-16 shrink-0 border-r border-sidebar-border/80 bg-sidebar md:block">
          <NavigationRail
            view={view}
            onViewChange={setView}
          />
        </aside>

        <main className="relative flex min-h-screen flex-1 flex-col">
          <div className="absolute left-3 top-3 z-20 md:hidden">
            <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-md border border-border/70 bg-background/85 text-muted-foreground"
                  aria-label="Open navigation"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-none border-r border-border/80 bg-sidebar p-0">
                <NavigationRail
                  view={view}
                  onViewChange={(nextView) => {
                    setView(nextView);
                    setMobileRailOpen(false);
                  }}
                />
              </SheetContent>
            </Sheet>
          </div>

          {view === 'chat' && (
            <section className="flex min-h-0 flex-1 flex-col px-5 pb-6 pt-14 md:px-12 md:pb-8 md:pt-8 lg:px-16">
              <div className="mx-auto flex w-full max-w-4xl flex-1 min-h-0 flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-8 pb-6">
                    {messages.map(message => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messageEndRef} />
                  </div>
                </div>

                <form
                  className="pt-3"
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
              </div>
            </section>
          )}

          {view === 'library' && (
            <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-4 md:px-12 md:pt-6 lg:px-16">
              <div className="mx-auto w-full max-w-3xl">
                <h1 className="text-base font-semibold tracking-tight">library</h1>
                <p className="mt-2 text-sm text-muted-foreground">Downloaded packs live in browser storage and remain available offline.</p>

                {installedPacks.length === 0 ? (
                  <p className="mt-16 text-sm text-muted-foreground">No packs installed. Run setup again to add offline knowledge packs.</p>
                ) : (
                  <ul className="mt-10 divide-y divide-border/70 border-y border-border/70">
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
              </div>
            </section>
          )}

          {view === 'settings' && (
            <section className="min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-4 md:px-12 md:pt-6 lg:px-16">
              <div className="mx-auto w-full max-w-3xl">
                <h1 className="text-base font-semibold tracking-tight">settings</h1>

                <div className="mt-10 space-y-12">
                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold">offline bundle</h2>
                    <p className="text-xs text-muted-foreground">
                      export a self-contained package you can save and run without internet on desktop or mobile.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExportingOfflineBundle}
                      onClick={() => {
                        void handleDownloadOfflineBundle();
                      }}
                    >
                      <Download className="mr-2 size-4" />
                      {isExportingOfflineBundle ? 'building bundle…' : 'download offline app bundle'}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      includes the current app shell and all built-in knowledge packs.
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
                    <h2 className="text-sm font-semibold">models</h2>
                    <p className="text-xs text-muted-foreground">
                      {runtimeCompatibility.headline}. {runtimeCompatibility.detail}
                    </p>
                    {engineError && <p className="text-xs text-destructive">{engineError}</p>}

                    <ul className="divide-y divide-border/70 border-y border-border/70">
                      {availableModels.map(model => {
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
                    <p className="text-xs text-muted-foreground">Remove local model cache, downloaded packs, and app settings from this browser.</p>

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
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );

  async function handleDownloadOfflineBundle() {
    if (isExportingOfflineBundle) {
      return;
    }

    setIsExportingOfflineBundle(true);

    try {
      const zip = new JSZip();
      const indexResponse = await fetch('/index.html', { cache: 'no-store' });
      if (!indexResponse.ok) {
        throw new Error('Failed to fetch app index for offline bundle.');
      }

      const indexHtmlSource = await indexResponse.text();
      const discoveredAssets = extractAssetPathsFromIndex(indexHtmlSource);
      const filesToFetch = Array.from(new Set([...OFFLINE_EXPORT_FILES, ...discoveredAssets]));

      for (const filePath of filesToFetch) {
        const normalizedPath = normalizeAssetPath(filePath);
        const response = await fetch(normalizedPath, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error(`Missing required file for offline export: ${normalizedPath}`);
        }

        const outputPath = normalizedPath.replace(/^\//, '');

        if (normalizedPath === '/index.html') {
          const rewrittenIndex = injectOfflineBootstrap(indexHtmlSource);
          zip.file(outputPath, rewrittenIndex);
          continue;
        }

        const contentType = response.headers.get('content-type');

        if (isTextAsset(contentType, normalizedPath)) {
          const sourceText = await response.text();
          const rewrittenText = rewriteTextAssetForOffline(sourceText, normalizedPath);
          zip.file(outputPath, rewrittenText);
        } else {
          const binary = await response.arrayBuffer();
          zip.file(outputPath, binary);
        }
      }

      zip.file(
        'README.txt',
        [
          'Citadel Chat Offline Bundle',
          '',
          'How to use:',
          '1. Extract this zip.',
          '2. Open index.html from local storage.',
          '3. If your browser blocks local file execution, serve this folder with any simple static server.',
          '',
          'This bundle includes the app shell and built-in knowledge packs for offline use.',
        ].join('\n'),
      );

      const archiveBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
      const downloadUrl = URL.createObjectURL(archiveBlob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `citadel-chat-offline-bundle-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Offline bundle ready',
        description: 'Download started. Save the zip to keep a self-contained offline copy.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Offline bundle creation failed.';
      toast({
        title: 'Offline export failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExportingOfflineBundle(false);
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

function NavigationRail({
  view,
  onViewChange,
}: {
  view: AppView;
  onViewChange: (view: AppView) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center py-4">
      <div className="flex flex-col gap-2">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = view === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={cn(
                'rail-icon-transition relative flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground',
                active && 'text-primary',
              )}
              aria-label={item.label}
              title={item.label}
            >
              {active && <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-primary" aria-hidden />}
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>

      <a
        href="https://citadelwire.com"
        target="_blank"
        rel="noreferrer"
        aria-label="Citadel"
        className="mt-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-sidebar-border/80 bg-sidebar-accent/40 hover:border-primary/60"
      >
        <img src="/citadel-logo.png" alt="Citadel" className="h-6 w-6 rounded-full object-cover" />
      </a>
    </div>
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
