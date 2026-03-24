import { useMemo, useState } from 'react';
import { Cpu, HardDriveDownload, Layers, Moon, ShieldCheck, Sparkles, Sun, Zap, Database, Lock, CheckCircle2 } from 'lucide-react';

import { useCitadel } from '@/contexts/CitadelContext';
import { useTheme } from '@/hooks/useTheme';
import { KNOWLEDGE_PACKS, KNOWLEDGE_PRESETS } from '@/lib/knowledge-packs';
import { formatBytes } from '@/lib/webllm-models';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const {
    availableModels,
    benchmarkResult,
    cachedModelStatus,
    completeInitialSetup,
    isBenchmarkRunning,
    loadProgress,
    runtimeCompatibility,
    runtimeModelSupport,
    runOnboardingBenchmark,
    isLoadingEngine,
    hasWebGpu,
    isOnline,
  } = useCitadel();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const modelsToOffer = useMemo(
    () => availableModels.filter(model => runtimeModelSupport[model.id] !== false),
    [availableModels, runtimeModelSupport]
  );

  const [selectedModelId, setSelectedModelId] = useState(
    modelsToOffer.find(model => model.recommended)?.id ?? modelsToOffer[0]?.id ?? '',
  );
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(
    KNOWLEDGE_PRESETS.find(preset => preset.id === 'starter')?.packIds ?? [],
  );
  const [autoLoadModel, setAutoLoadModel] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isApplyingBenchmark, setIsApplyingBenchmark] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => modelsToOffer.find(model => model.id === selectedModelId),
    [modelsToOffer, selectedModelId],
  );

  const compatibilityTone = runtimeCompatibility.status === 'supported'
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : runtimeCompatibility.status === 'limited'
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-destructive/30 bg-destructive/5';

  const totalKnowledgeBytes = useMemo(
    () => KNOWLEDGE_PACKS
      .filter(pack => selectedPackIds.includes(pack.id))
      .reduce((sum, pack) => sum + pack.sizeBytes, 0),
    [selectedPackIds],
  );

  const totalDownloadBytes = (selectedModel?.sizeBytes ?? 0) + totalKnowledgeBytes;

  function togglePack(packId: string, enabled: boolean) {
    setSelectedPackIds((current) => {
      if (enabled) {
        return Array.from(new Set([...current, packId]));
      }

      return current.filter(id => id !== packId);
    });
  }

  function applyPreset(presetId: string) {
    const preset = KNOWLEDGE_PRESETS.find(item => item.id === presetId);
    if (!preset) {
      return;
    }

    setSelectedPackIds(preset.packIds);
  }

  async function handleInstall() {
    setError(null);
    setIsInstalling(true);

    try {
      await completeInitialSetup({
        selectedModelId,
        packIds: selectedPackIds,
        autoLoadModel,
      });
      onComplete();
    } catch (installError) {
      const message = installError instanceof Error ? installError.message : 'Setup failed.';
      setError(message);
    } finally {
      setIsInstalling(false);
    }
  }

  async function handleRunBenchmark() {
    setBenchmarkError(null);
    setIsApplyingBenchmark(true);

    try {
      const result = await runOnboardingBenchmark();
      setSelectedModelId(result.recommendedModelId);
    } catch (benchmarkRunError) {
      const message = benchmarkRunError instanceof Error ? benchmarkRunError.message : 'Benchmark failed.';
      setBenchmarkError(message);
    } finally {
      setIsApplyingBenchmark(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl animate-fade-in-up">
        {/* Header */}
        <div className="mb-6 grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border bg-card/80 p-4 backdrop-blur-sm card-refined">
          <a
            href="https://citadelwire.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-transparent p-1.5 transition-all duration-200 hover:border-border hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/citadel-logo.jpg"
              alt="Citadel"
              className="h-10 w-10 rounded-xl object-contain"
            />
            <span className="hidden text-lg font-bold tracking-tight sm:inline-block">Citadel</span>
          </a>

          <div className="hidden justify-self-center sm:block">
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
          </div>

          <a
            href="https://odell.xyz"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-xs font-medium text-primary transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
          >
            curated by ODELL
            <img
              src="/odell-badge.jpg"
              alt="ODELL"
              className="h-5 w-5 rounded object-cover"
            />
          </a>
        </div>

        {/* Hero Section */}
        <div className="mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-card/80 p-8 shadow-lg card-refined">
          <div className="mb-6 flex items-start gap-5">
            <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4">
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome to Citadel</h1>
              <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                Set up your offline AI command center. Download a local model and knowledge packs once, then run everything privately in your browser.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border bg-background/50 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Database className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Storage</p>
                <p className="text-sm font-medium">Browser IndexedDB</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-background/50 p-4">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Zap className="size-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Inference</p>
                <p className="text-sm font-medium">WebGPU Accelerated</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-background/50 p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Lock className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Privacy</p>
                <p className="text-sm font-medium">100% Offline</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <Alert className={`mb-4 ${compatibilityTone}`}>
          <Cpu className="size-4" />
          <AlertTitle className="font-semibold">{runtimeCompatibility.headline}</AlertTitle>
          <AlertDescription>
            <p className="mb-2 mt-1 leading-relaxed">{runtimeCompatibility.detail}</p>
            {runtimeCompatibility.recommendations.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {runtimeCompatibility.recommendations.map((tip) => (
                  <li key={tip} className="text-muted-foreground">{tip}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>

        {!hasWebGpu && (
          <Alert className="mb-4 border-destructive/30 bg-destructive/5">
            <Cpu className="size-4" />
            <AlertTitle>Graphics acceleration unavailable</AlertTitle>
            <AlertDescription className="leading-relaxed">
              This browser does not expose WebGPU. Citadel Chat may still work with reduced performance if your browser provides compatible fallback support.
            </AlertDescription>
          </Alert>
        )}

        {!isOnline && (
          <Alert className="mb-4 border-primary/30 bg-primary/5">
            <HardDriveDownload className="size-4" />
            <AlertTitle>Currently offline</AlertTitle>
            <AlertDescription className="leading-relaxed">
              You can still use already-downloaded resources. To install new models or knowledge packs, reconnect to the internet temporarily.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Tabs */}
        <div className="rounded-2xl border bg-card/80 p-6 shadow-sm card-refined">
          <Tabs defaultValue="model" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="model" className="rounded-lg gap-2 data-[state=active]:bg-card">
                <Cpu className="size-4" />
                1. Model
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="rounded-lg gap-2 data-[state=active]:bg-card">
                <Database className="size-4" />
                2. Knowledge Packs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="model" className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold mb-1">Select Local AI Model</h3>
                <p className="text-sm text-muted-foreground">Choose based on your device capabilities. Smaller models are faster; larger models provide better quality.</p>
              </div>

              {/* Benchmark */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRunBenchmark()}
                    disabled={isBenchmarkRunning || isApplyingBenchmark || runtimeCompatibility.status === 'unsupported'}
                    className="gap-2"
                  >
                    <Zap className="size-4" />
                    {isBenchmarkRunning || isApplyingBenchmark ? 'Running benchmark…' : 'Run device benchmark'}
                  </Button>

                  {benchmarkResult && (
                    <>
                      <Badge variant="secondary" className="gap-1.5">
                        <span className="status-dot status-dot-ok" />
                        Score {benchmarkResult.score} · {benchmarkResult.tier.toUpperCase()} tier
                      </Badge>
                      <Badge variant="outline">
                        Recommended: {modelsToOffer.find(model => model.id === benchmarkResult.recommendedModelId)?.name ?? benchmarkResult.recommendedModelId}
                      </Badge>
                    </>
                  )}
                </div>
                {benchmarkResult && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    CPU {benchmarkResult.cpuScore} · GPU {benchmarkResult.gpuScore}
                  </p>
                )}
                {benchmarkError && (
                  <p className="mt-2 text-xs text-destructive">{benchmarkError}</p>
                )}
              </div>

              {/* Model Selection */}
              <div className="grid gap-4 sm:grid-cols-2">
                {modelsToOffer.map(model => {
                  const isSelected = model.id === selectedModelId;
                  const isCached = cachedModelStatus[model.id];
                  const isRuntimeSupported = runtimeModelSupport[model.id] ?? true;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModelId(model.id)}
                      disabled={!isRuntimeSupported}
                      className={cn(
                        'group relative rounded-xl border p-5 text-left transition-all duration-200',
                        isSelected 
                          ? 'border-primary/50 bg-primary/5 shadow-md glow-primary' 
                          : 'border-border/50 hover:border-primary/30 hover:shadow-sm',
                        !isRuntimeSupported && 'opacity-60 border-dashed',
                      )}
                    >
                      {isSelected && (
                        <div className="absolute right-4 top-4">
                          <CheckCircle2 className="size-5 text-primary" />
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-2">
                        <p className="font-semibold text-base">{model.name}</p>
                        <div className="flex gap-1.5">
                          {model.recommended && <Badge size="sm">Recommended</Badge>}
                          {isCached && <Badge variant="secondary" size="sm">Cached</Badge>}
                          {!isRuntimeSupported && <Badge variant="outline" size="sm">Unsupported</Badge>}
                        </div>
                      </div>
                      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{model.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" size="sm">{model.sizeLabel}</Badge>
                        <Badge variant="outline" size="sm">{model.speed} speed</Badge>
                        <Badge variant="outline" size="sm">{model.quality} quality</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold mb-1">Choose Offline Knowledge</h3>
                <p className="text-sm text-muted-foreground">Select a preset for quick setup, or customize individual knowledge packs.</p>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center text-sm text-muted-foreground pr-2">Presets:</span>
                {KNOWLEDGE_PRESETS.map(preset => (
                  <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset.id)}>
                    {preset.name}
                  </Button>
                ))}
              </div>
              
              <Separator />

              {/* Pack Selection */}
              <div className="grid gap-3 sm:grid-cols-2">
                {KNOWLEDGE_PACKS.map(pack => {
                  const enabled = selectedPackIds.includes(pack.id);

                  return (
                    <label
                      key={pack.id}
                      className={cn(
                        'flex cursor-pointer gap-4 rounded-xl border p-4 transition-all duration-200',
                        enabled 
                          ? 'border-primary/50 bg-primary/5 shadow-sm' 
                          : 'border-border/50 hover:border-primary/30 hover:bg-accent/30'
                      )}
                    >
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(checked) => togglePack(pack.id, Boolean(checked))}
                        className="mt-0.5 size-5"
                      />
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{pack.title}</p>
                          {pack.recommended && <Badge variant="secondary" size="sm">Recommended</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{pack.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {pack.sizeLabel} · {pack.docCount} documents
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Summary */}
        <Card className="mt-6 border-border/50 card-refined">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Layers className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Download Summary</CardTitle>
                <CardDescription>One-time setup. Resources stay in local storage for offline use.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected Model</p>
                <p className="mt-1 font-semibold">{selectedModel?.name ?? 'None selected'}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Knowledge Packs</p>
                <p className="mt-1 font-semibold">{selectedPackIds.length} packs selected</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Download</p>
                <p className="mt-1 font-semibold">{formatBytes(totalDownloadBytes)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="space-y-0.5">
                <p className="font-medium">Auto-load model on startup</p>
                <p className="text-xs text-muted-foreground">Speeds up first interaction after app launch</p>
              </div>
              <Switch checked={autoLoadModel} onCheckedChange={setAutoLoadModel} />
            </div>

            {/* Progress */}
            {(isInstalling || isLoadingEngine) && (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{loadProgress.text}</span>
                  <span className="font-medium">{Math.round(loadProgress.progress * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Setup failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Resources are stored locally in your browser and can be cleared at any time from browser settings.
            </p>
            <Button
              type="button"
              onClick={handleInstall}
              disabled={!isOnline || isInstalling || isLoadingEngine || !selectedModelId || runtimeCompatibility.status === 'unsupported'}
              size="lg"
              className="gap-2 px-6"
            >
              {isInstalling || isLoadingEngine ? (
                <>
                  <Layers className="size-4 animate-spin" />
                  Installing…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Install and Launch
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
