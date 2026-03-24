import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  DownloadCloud,
  HardDrive,
  Menu,
  MessageSquare,
  Moon,
  PlugZap,
  Send,
  Settings,
  Sun,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { useSeoMeta } from '@unhead/react';

import { useCitadel, type CitadelMessage } from '@/contexts/CitadelContext';
import { useTheme } from '@/hooks/useTheme';
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
  SheetHeader,
  SheetTitle,
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
    runtimeCompatibility,
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
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

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

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-5 p-5">
      {/* Logo & Branding */}
      <div className="rounded-2xl border bg-card/95 p-5 shadow-sm card-refined">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2.5">
            <Brain className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Citadel</h2>
            <p className="text-xs text-muted-foreground font-medium">Offline AI Command Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1.5">
        <SidebarButton active={view === 'chat'} icon={MessageSquare} onClick={() => setView('chat')}>
          Operations Chat
        </SidebarButton>
        <SidebarButton active={view === 'library'} icon={HardDrive} onClick={() => setView('library')}>
          Knowledge Library
        </SidebarButton>
        <SidebarButton active={view === 'settings'} icon={Settings} onClick={() => setView('settings')}>
          System Settings
        </SidebarButton>
      </nav>

      <Separator className="my-2" />

      {/* System Status */}
      <div className="rounded-2xl border bg-card/95 p-4 shadow-sm card-refined">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">System Status</p>
        <div className="space-y-3">
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
        </div>
      </div>

      {/* Loading Progress */}
      {isLoadingEngine && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-medium text-muted-foreground">{loadProgress.text}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{Math.round(loadProgress.progress * 100)}%</p>
          </CardContent>
        </Card>
      )}

      {/* Engine Error */}
      {engineError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-xs text-destructive leading-relaxed">{engineError}</CardContent>
        </Card>
      )}

      {/* Compatibility Warning */}
      {runtimeCompatibility.status !== 'supported' && (
        <Card className={cn('border-dashed', runtimeCompatibility.status === 'unsupported' ? 'border-destructive/40' : 'border-amber-500/40')}>
          <CardContent className="space-y-2 p-4 text-xs">
            <p className="font-semibold text-foreground">{runtimeCompatibility.headline}</p>
            <p className="text-muted-foreground leading-relaxed">{runtimeCompatibility.detail}</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              {runtimeCompatibility.recommendations.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4">
        <a
          href="https://shakespeare.diy"
          target="_blank"
          rel="noreferrer"
          className="block text-center text-[10px] uppercase tracking-widest text-muted-foreground/40 transition-all duration-200 hover:text-primary"
        >
          Vibed with Shakespeare
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-4 sm:px-6">
          {/* Left - Logo */}
          <div className="flex items-center gap-3">
            <a
              href="https://citadelwire.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1 transition-all duration-200 hover:border-border hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src="/citadel-logo.jpg"
                alt="Citadel"
                className="h-8 w-8 rounded-lg object-contain"
              />
              <span className="hidden font-semibold tracking-tight sm:inline-block">Citadel</span>
            </a>
            
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9">
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Center - View Title */}
          <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">/</span>
              <span className="font-medium capitalize">
                {view === 'chat' ? 'Operations Chat' : view === 'library' ? 'Knowledge Library' : 'System Settings'}
              </span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Quick Actions
                  <ChevronRight className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Citadel</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView('chat')} className="gap-2">
                  <MessageSquare className="size-4" />
                  Open chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('library')} className="gap-2">
                  <HardDrive className="size-4" />
                  Open library
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('settings')} className="gap-2">
                  <Settings className="size-4" />
                  Open settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="size-9"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <a
              href="https://odell.xyz"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-primary transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 sm:flex"
            >
              curated by ODELL
              <img
                src="/odell-badge.jpg"
                alt="ODELL"
                className="h-5 w-5 rounded object-cover"
              />
            </a>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="mx-auto flex max-w-[1800px]">
        {/* Desktop Sidebar */}
        <aside className="hidden w-72 border-r bg-sidebar lg:block">
          <SidebarContent />
        </aside>

        {/* Content */}
        <main className="min-h-[calc(100vh-3.5rem)] flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            {view === 'chat' && (
              <div className="mx-auto max-w-3xl">
                {/* Chat Header */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">Operations Chat</h1>
                    <p className="text-sm text-muted-foreground">
                      {selectedModel ? `${selectedModel.name} · ${selectedModel.sizeLabel}` : 'No model selected'}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <Badge 
                      variant={isEngineReady ? 'default' : 'secondary'}
                      className={cn(
                        'gap-1.5 px-3 py-1',
                        isEngineReady && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      )}
                    >
                      <span className={cn('status-dot', isEngineReady ? 'status-dot-ok' : 'status-dot-warn')} />
                      {isEngineReady ? 'Model ready' : 'Model not loaded'}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 px-3 py-1">
                      <HardDrive className="size-3" />
                      {installedPacks.length} packs
                    </Badge>
                    <div className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-1.5">
                      <span className="text-xs text-muted-foreground">Knowledge</span>
                      <Switch checked={useKnowledge} onCheckedChange={setUseKnowledge} className="scale-90" />
                    </div>
                  </div>
                </div>

                {/* Chat Card */}
                <Card className="flex h-[calc(100vh-14rem)] flex-col overflow-hidden border-border/50 bg-card/50 shadow-sm card-refined">
                  <ScrollArea className="flex-1 p-5">
                    <div className="space-y-5">
                      {messages.map((message, index) => (
                        <MessageBubble key={message.id} message={message} index={index} />
                      ))}

                      {isSending && (
                        <div className="rounded-2xl border bg-card p-5 shadow-sm animate-fade-in">
                          <Skeleton className="mb-3 h-3 w-20" />
                          <Skeleton className="mb-2 h-4 w-full" />
                          <Skeleton className="mb-2 h-4 w-11/12" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  <CardContent className="border-t bg-card/80 p-4">
                    <div className="space-y-3">
                      <Textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Ask anything from your local AI…"
                        className="min-h-[100px] resize-none rounded-xl border-input bg-background/50 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
                        onKeyDown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault();
                            void handleSend();
                          }
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">⌘ + Enter to send</p>
                        <Button 
                          onClick={() => void handleSend()} 
                          disabled={!prompt.trim() || isSending || !isEngineReady}
                          className="gap-2 px-5"
                        >
                          <Send className="size-4" />
                          Send
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {view === 'library' && (
              <div className="mx-auto max-w-5xl space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Knowledge Library</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage your offline knowledge packs stored in browser IndexedDB
                  </p>
                </div>

                <Card className="border-border/50 card-refined">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <HardDrive className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Downloaded Knowledge Packs</CardTitle>
                        <CardDescription>Stored locally for offline access</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {installedPacks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-10 text-center">
                        <HardDrive className="mx-auto mb-3 size-10 text-muted-foreground/40" />
                        <p className="font-medium text-muted-foreground">No packs installed</p>
                        <p className="mt-1 text-sm text-muted-foreground/60">Re-run setup to add offline knowledge packs</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/50">
                            <TableHead className="font-semibold">Pack</TableHead>
                            <TableHead className="font-semibold">Size</TableHead>
                            <TableHead className="font-semibold">Documents</TableHead>
                            <TableHead className="text-right font-semibold">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installedPacks.map(pack => (
                            <TableRow key={pack.id} className="border-border/30">
                              <TableCell>
                                <div>
                                  <p className="font-medium">{pack.title}</p>
                                  <p className="text-xs text-muted-foreground">{pack.description}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{pack.sizeLabel}</TableCell>
                              <TableCell className="text-muted-foreground">{pack.docCount}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void removeKnowledgePack(pack.id)}
                                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
              <div className="mx-auto max-w-5xl space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">System Settings</h1>
                  <p className="text-sm text-muted-foreground">
                    Configure your local AI model and storage preferences
                  </p>
                </div>

                {/* Model Management */}
                <Card className="border-border/50 card-refined">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Brain className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Local Model Management</CardTitle>
                        <CardDescription>Select and load AI models based on your needs</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {availableModels.map(model => {
                      const cached = cachedModelStatus[model.id];
                      const active = model.id === (currentModelId ?? appSettings.selectedModelId);

                      return (
                        <div 
                          key={model.id} 
                          className={cn(
                            'rounded-xl border p-5 transition-all duration-200',
                            active 
                              ? 'border-primary/50 bg-primary/5 shadow-sm glow-subtle' 
                              : 'border-border/50 hover:border-primary/30 hover:shadow-sm'
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="font-semibold">{model.name}</p>
                            <div className="flex gap-2">
                              {model.recommended && <Badge size="sm">Recommended</Badge>}
                              {cached && <Badge variant="secondary" size="sm">Cached</Badge>}
                              {active && <Badge size="sm" className="bg-primary/10 text-primary border-primary/20">Active</Badge>}
                            </div>
                          </div>
                          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{model.description}</p>
                          <div className="mb-4 flex flex-wrap gap-2">
                            <Badge variant="outline" size="sm">{model.sizeLabel}</Badge>
                            <Badge variant="outline" size="sm">{model.speed} speed</Badge>
                            <Badge variant="outline" size="sm">{model.quality} quality</Badge>
                          </div>
                          <Button
                            variant={active ? 'secondary' : 'default'}
                            size="sm"
                            disabled={isLoadingEngine}
                            onClick={() => void loadModel(model.id)}
                            className="w-full"
                          >
                            {active ? 'Currently Active' : cached ? 'Load Cached' : 'Download & Load'}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Storage */}
                <Card className="border-border/50 card-refined">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <DownloadCloud className="size-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Storage Management</CardTitle>
                        <CardDescription>Monitor and manage local storage usage</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      variant="outline"
                      disabled={loadingStorage}
                      onClick={() => {
                        setLoadingStorage(true);
                        void getStorageInfo()
                          .then(setStorageUsage)
                          .finally(() => setLoadingStorage(false));
                      }}
                      className="gap-2"
                    >
                      <DownloadCloud className="size-4" />
                      Check Storage Usage
                    </Button>

                    {storageUsage && (
                      <div className="rounded-xl border bg-muted/30 p-5 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Used</span>
                          <span className="font-medium">{formatBytes(storageUsage.usedBytes)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Available Quota</span>
                          <span className="font-medium">{formatBytes(storageUsage.quotaBytes)}</span>
                        </div>
                        <div className="pt-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                              style={{ width: `${Math.round((storageUsage.usedBytes / storageUsage.quotaBytes) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 p-4">
                      <div className="space-y-0.5">
                        <p className="font-medium">Auto-load model on startup</p>
                        <p className="text-xs text-muted-foreground">Faster first interaction after app launch</p>
                      </div>
                      <Switch
                        checked={appSettings.autoLoadModel}
                        onCheckedChange={(checked) => {
                          void saveSettings({ autoLoadModel: checked });
                        }}
                      />
                    </div>

                    <Separator />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full gap-2">
                          Reset All Local Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reset Citadel Chat?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove all local model caches, downloaded knowledge packs, and saved settings from this browser. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              void resetApplicationData();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Reset Everything
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
        'sidebar-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm',
        active && 'active'
      )}
    >
      <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
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
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5 text-muted-foreground">
        <Icon className="size-4" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('font-medium', tone === 'ok' ? 'text-emerald-600' : 'text-amber-500')}>
          {value}
        </span>
        <span className={cn('status-dot', tone === 'ok' ? 'status-dot-ok' : 'status-dot-warn')} />
      </div>
    </div>
  );
}

function MessageBubble({ message, index = 0 }: { message: CitadelMessage; index?: number }) {
  const isUser = message.role === 'user';

  return (
    <div 
      className={cn(
        'flex animate-fade-in-up',
        isUser ? 'justify-end' : 'justify-start'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl p-5 transition-all duration-200',
          isUser 
            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm' 
            : 'bg-card border border-border/50 shadow-sm'
        )}
      >
        <p className={cn(
          'mb-2 text-[10px] font-semibold uppercase tracking-widest',
          isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {isUser ? 'You' : 'Citadel AI'}
        </p>
        <div className={cn('whitespace-pre-wrap text-sm leading-relaxed', !isUser && 'prose-citadel')}>
          {message.content || <span className="typing-cursor">Analyzing</span>}
        </div>
        {message.runtimeStats && (
          <p className="mt-3 text-[10px] text-muted-foreground/70 font-mono">{message.runtimeStats}</p>
        )}
      </div>
    </div>
  );
}
