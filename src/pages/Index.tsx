import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  DownloadCloud,
  HardDrive,
  Menu,
  MessageSquare,
  PlugZap,
  Send,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { useSeoMeta } from '@unhead/react';

import { useCitadel, type CitadelMessage } from '@/contexts/CitadelContext';
import { SetupWizard } from '@/components/SetupWizard';
import { KNOWLEDGE_PACKS } from '@/lib/knowledge-packs';
import { formatBytes } from '@/lib/webllm-models';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const INITIAL_MESSAGE: CitadelMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Citadel Chat is online locally. Ask anything from your downloaded packs or run general local AI chat.',
  createdAt: Date.now(),
};

type AppView = 'chat' | 'library' | 'settings';

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
    hasWebGpu,
    isEngineReady,
    isLoadingEngine,
    isOnline,
    loadModel,
    loadProgress,
    removeKnowledgePack,
    resetApplicationData,
    saveSettings,
    sendMessage,
  } = useCitadel();

  const [setupCompletedState, setSetupCompletedState] = useState(appSettings.setupComplete);

  useEffect(() => {
    setSetupCompletedState(appSettings.setupComplete);
  }, [appSettings.setupComplete]);
  const [view, setView] = useState<AppView>('chat');

  const [messages, setMessages] = useState<CitadelMessage[]>([INITIAL_MESSAGE]);
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [useKnowledge, setUseKnowledge] = useState(true);

  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);

  const setupIsComplete = setupCompletedState && appSettings.setupComplete;

  const selectedModel = useMemo(
    () => availableModels.find(model => model.id === (currentModelId ?? appSettings.selectedModelId)),
    [availableModels, currentModelId, appSettings.selectedModelId],
  );

  const installedPacks = useMemo(
    () => KNOWLEDGE_PACKS.filter(pack => downloadedPackIds.includes(pack.id)),
    [downloadedPackIds],
  );

  if (!setupIsComplete) {
    return <SetupWizard onComplete={() => setSetupCompletedState(true)} />;
  }

  const Sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="rounded-2xl border bg-card/90 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Brain className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">Citadel Chat</h2>
            <p className="text-xs text-muted-foreground">Offline command center</p>
          </div>
        </div>
        <a
          href="https://shakespeare.diy"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-xs text-primary underline underline-offset-4"
        >
          Vibed with Shakespeare
        </a>
      </div>

      <div className="space-y-2">
        <SidebarButton active={view === 'chat'} icon={MessageSquare} onClick={() => setView('chat')}>
          Chat
        </SidebarButton>
        <SidebarButton active={view === 'library'} icon={HardDrive} onClick={() => setView('library')}>
          Library
        </SidebarButton>
        <SidebarButton active={view === 'settings'} icon={Settings} onClick={() => setView('settings')}>
          Settings
        </SidebarButton>
      </div>

      <Separator />

      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4">
          <StatusRow
            label="Network"
            value={isOnline ? 'Online' : 'Offline'}
            icon={isOnline ? Wifi : WifiOff}
            tone={isOnline ? 'ok' : 'warn'}
          />
          <StatusRow
            label="WebGPU"
            value={hasWebGpu ? 'Detected' : 'Missing'}
            icon={PlugZap}
            tone={hasWebGpu ? 'ok' : 'warn'}
          />
          <StatusRow
            label="Model"
            value={isEngineReady ? 'Loaded' : isLoadingEngine ? 'Loading' : 'Idle'}
            icon={Brain}
            tone={isEngineReady ? 'ok' : 'warn'}
          />
        </CardContent>
      </Card>

      {isLoadingEngine && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-xs text-muted-foreground">{loadProgress.text}</p>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {engineError && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-xs text-destructive">{engineError}</CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-card/50 lg:block">{Sidebar}</aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="size-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] p-0">
                    {Sidebar}
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://citadelwire.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Visit Citadel Wire"
                  className="inline-flex items-center rounded-lg border border-transparent transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src="/citadel-logo.jpg"
                    alt="Citadel"
                    className="h-12 w-12 rounded-md object-contain"
                  />
                </a>
                <div>
                  <h1 className="text-lg font-semibold">{view === 'chat' ? 'Operations Chat' : view === 'library' ? 'Knowledge Library' : 'System Settings'}</h1>
                  <p className="text-xs text-muted-foreground">
                    {selectedModel ? `${selectedModel.name} · ${selectedModel.sizeLabel}` : 'No model selected'}
                  </p>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">Quick Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Citadel</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setView('chat')}>Open chat</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView('library')}>Open library</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView('settings')}>Open settings</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-6">
            {view === 'chat' && (
              <Card className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={isEngineReady ? 'default' : 'secondary'}>{isEngineReady ? 'Model ready' : 'Model not loaded'}</Badge>
                    <Badge variant="outline">Packs: {installedPacks.length}</Badge>
                    <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Use knowledge</span>
                      <Switch checked={useKnowledge} onCheckedChange={setUseKnowledge} />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 min-h-0 flex-col gap-4">
                  <ScrollArea className="flex-1 rounded-xl border bg-muted/15 p-4">
                    <div className="space-y-4">
                      {messages.map(message => (
                        <MessageBubble key={message.id} message={message} />
                      ))}

                      {isSending && (
                        <div className="rounded-xl border bg-background p-4">
                          <Skeleton className="mb-2 h-4 w-1/4" />
                          <Skeleton className="mb-2 h-4 w-11/12" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <div className="space-y-2">
                    <Textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Ask Citadel Chat…"
                      className="min-h-[110px]"
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Ctrl/Cmd + Enter to send</p>
                      <Button onClick={() => void handleSend()} disabled={!prompt.trim() || isSending || !isEngineReady}>
                        <Send className="mr-2 size-4" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {view === 'library' && (
              <div className="mx-auto max-w-5xl space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Downloaded Knowledge Packs</CardTitle>
                    <CardDescription>
                      Packs are stored in browser IndexedDB and remain available offline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {installedPacks.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        No packs installed. Re-run setup to add offline knowledge packs.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pack</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Docs</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installedPacks.map(pack => (
                            <TableRow key={pack.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{pack.title}</p>
                                  <p className="text-xs text-muted-foreground">{pack.description}</p>
                                </div>
                              </TableCell>
                              <TableCell>{pack.sizeLabel}</TableCell>
                              <TableCell>{pack.docCount}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void removeKnowledgePack(pack.id)}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {view === 'settings' && (
              <div className="mx-auto max-w-5xl space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Local Model Management</CardTitle>
                    <CardDescription>
                      Switch models based on performance needs. Cached status shows local availability.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {availableModels.map(model => {
                      const cached = cachedModelStatus[model.id];
                      const active = model.id === (currentModelId ?? appSettings.selectedModelId);

                      return (
                        <div key={model.id} className={cn('rounded-xl border p-4', active && 'border-primary bg-primary/5')}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="font-semibold">{model.name}</p>
                            {cached && <Badge variant="secondary">Cached</Badge>}
                          </div>
                          <p className="mb-3 text-sm text-muted-foreground">{model.description}</p>
                          <div className="mb-3 flex gap-2">
                            <Badge variant="outline">{model.sizeLabel}</Badge>
                            <Badge variant="outline">{model.speed}</Badge>
                          </div>
                          <Button
                            variant={active ? 'secondary' : 'default'}
                            size="sm"
                            disabled={isLoadingEngine}
                            onClick={() => void loadModel(model.id)}
                          >
                            {active ? 'Active' : 'Load model'}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Storage</CardTitle>
                    <CardDescription>
                      Estimate local usage for models and knowledge resources.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      disabled={loadingStorage}
                      onClick={() => {
                        setLoadingStorage(true);
                        void getStorageInfo()
                          .then(setStorageUsage)
                          .finally(() => setLoadingStorage(false));
                      }}
                    >
                      <DownloadCloud className="mr-2 size-4" />
                      Check storage usage
                    </Button>

                    {storageUsage && (
                      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
                        <p>Used: {formatBytes(storageUsage.usedBytes)}</p>
                        <p>Quota: {formatBytes(storageUsage.quotaBytes)}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-xl border p-4">
                      <div>
                        <p className="font-medium">Auto-load model on startup</p>
                        <p className="text-xs text-muted-foreground">Disabled saves memory until you manually load.</p>
                      </div>
                      <Switch
                        checked={appSettings.autoLoadModel}
                        onCheckedChange={(checked) => {
                          void saveSettings({ autoLoadModel: checked });
                        }}
                      />
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Reset all local data</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Citadel Chat?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes local model caches, downloaded packs, and saved settings from this browser.
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
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

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
          content: 'Local model is not ready yet. Please load a model in Settings.',
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

function SidebarButton({
  active,
  icon: Icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted',
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function StatusRow({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: 'ok' | 'warn';
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <span className={cn('font-medium', tone === 'ok' ? 'text-primary' : 'text-amber-500')}>
        {value}
      </span>
    </div>
  );
}

function MessageBubble({ message }: { message: CitadelMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[90%] rounded-2xl border p-4 sm:max-w-[80%]',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-card',
        )}
      >
        <p className={cn('mb-2 text-xs font-semibold uppercase tracking-wide', isUser ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          {isUser ? 'You' : 'Citadel'}
        </p>
        <div className={cn('whitespace-pre-wrap text-sm leading-relaxed', !isUser && 'prose-citadel')}>
          {message.content || <span className="typing-cursor">Thinking</span>}
        </div>
        {message.runtimeStats && (
          <p className="mt-2 text-[11px] text-muted-foreground">{message.runtimeStats}</p>
        )}
      </div>
    </div>
  );
}
