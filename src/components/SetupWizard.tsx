import { useMemo, useState } from 'react';
import { Cpu, HardDriveDownload, Layers, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react';

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
    ? 'border-primary/40'
    : runtimeCompatibility.status === 'limited'
      ? 'border-amber-500/40'
      : 'border-destructive/40';

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl animate-fade-in-up">
        <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border bg-card/80 px-4 py-2 backdrop-blur">
          <a
            href="https://citadelwire.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-transparent p-1 transition hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/citadel-logo.jpg"
              alt="Citadel"
              className="h-9 w-9 rounded-md object-contain"
            />
          </a>

          <div className="justify-self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-2"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
            </Button>
          </div>

          <a
            href="https://odell.xyz"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-xs text-primary underline-offset-4 transition hover:border-primary/30 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>curated by ODELL</span>
            <img
              src="/odell-badge.jpg"
              alt="ODELL"
              className="h-5 w-5 rounded object-cover"
            />
          </a>
        </div>
        <div className="mb-8 rounded-2xl border bg-card/80 p-6 shadow-xl backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Citadel Chat Setup</h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                First launch setup. Download your local model and offline knowledge packs once,
                then run fully offline.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Model cache</p>
              <p className="mt-1 text-sm font-medium">Browser local storage</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Inference</p>
              <p className="mt-1 text-sm font-medium">On-device WebGPU</p>
            </div>
            <div className="rounded-xl border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Privacy</p>
              <p className="mt-1 text-sm font-medium">No cloud required</p>
            </div>
          </div>
        </div>

        <Alert className={`mb-4 ${compatibilityTone}`}>
          <Cpu className="size-4" />
          <AlertTitle>{runtimeCompatibility.headline}</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{runtimeCompatibility.detail}</p>
            <ul className="list-disc pl-5">
              {runtimeCompatibility.recommendations.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        {!hasWebGpu && (
          <Alert className="mb-6 border-destructive/40">
            <Cpu className="size-4" />
            <AlertTitle>Graphics acceleration unavailable</AlertTitle>
            <AlertDescription>
              This browser does not expose WebGPU. Citadel Chat may still work with reduced performance if your browser provides compatible fallback support.
            </AlertDescription>
          </Alert>
        )}

        {!isOnline && (
          <Alert className="mb-6 border-primary/40">
            <HardDriveDownload className="size-4" />
            <AlertTitle>Currently offline</AlertTitle>
            <AlertDescription>
              You can still use already-downloaded resources. To install new model/packs, reconnect once for download.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="model" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="model">1. Model</TabsTrigger>
            <TabsTrigger value="knowledge">2. Knowledge Packs</TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Local AI Model</CardTitle>
                <CardDescription>
                  Pick based on your device. Smaller models are faster; larger models give better answers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-background/70 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRunBenchmark()}
                      disabled={isBenchmarkRunning || isApplyingBenchmark || runtimeCompatibility.status === 'unsupported'}
                    >
                      {isBenchmarkRunning || isApplyingBenchmark ? 'Benchmarking…' : 'Run device benchmark'}
                    </Button>

                    {benchmarkResult && (
                      <Badge variant="secondary">
                        Score {benchmarkResult.score} · {benchmarkResult.tier.toUpperCase()} tier
                      </Badge>
                    )}

                    {benchmarkResult && (
                      <Badge variant="outline">
                        Recommended: {modelsToOffer.find(model => model.id === benchmarkResult.recommendedModelId)?.name ?? benchmarkResult.recommendedModelId}
                      </Badge>
                    )}
                  </div>
                  {benchmarkResult && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      CPU {benchmarkResult.cpuScore} · GPU {benchmarkResult.gpuScore}
                    </p>
                  )}
                  {benchmarkError && (
                    <p className="mt-2 text-xs text-destructive">{benchmarkError}</p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
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
                          'rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected && 'border-primary bg-primary/5 shadow-md glow-primary',
                          !isRuntimeSupported && 'opacity-60 border-dashed',
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="font-semibold">{model.name}</p>
                          <div className="flex items-center gap-2">
                            {model.recommended && <Badge>Recommended</Badge>}
                            {isCached && <Badge variant="secondary">Cached</Badge>}
                            {!isRuntimeSupported && <Badge variant="outline">Not in runtime list</Badge>}
                          </div>
                        </div>
                        <p className="mb-3 text-sm text-muted-foreground">{model.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">{model.sizeLabel}</Badge>
                          <Badge variant="outline">Speed: {model.speed}</Badge>
                          <Badge variant="outline">Quality: {model.quality}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Choose Offline Knowledge</CardTitle>
                <CardDescription>
                  Select a preset, or customize individual packs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {KNOWLEDGE_PRESETS.map(preset => (
                    <Button key={preset.id} type="button" variant="outline" onClick={() => applyPreset(preset.id)}>
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  {KNOWLEDGE_PACKS.map(pack => {
                    const enabled = selectedPackIds.includes(pack.id);

                    return (
                      <label
                        key={pack.id}
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors',
                          enabled ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/30',
                        )}
                      >
                        <Checkbox
                          checked={enabled}
                          onCheckedChange={(checked) => togglePack(pack.id, Boolean(checked))}
                          className="mt-1"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{pack.title}</p>
                            {pack.recommended && <Badge variant="secondary">Recommended</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{pack.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {pack.sizeLabel} · {pack.docCount} docs
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Download Summary</CardTitle>
            <CardDescription>
              One-time setup download. Resources stay in local browser storage for offline use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-background/60 p-4">
                <p className="text-xs uppercase text-muted-foreground">Selected model</p>
                <p className="mt-1 text-sm font-semibold">{selectedModel?.name ?? 'None'}</p>
              </div>
              <div className="rounded-xl border bg-background/60 p-4">
                <p className="text-xs uppercase text-muted-foreground">Knowledge packs</p>
                <p className="mt-1 text-sm font-semibold">{selectedPackIds.length}</p>
              </div>
              <div className="rounded-xl border bg-background/60 p-4">
                <p className="text-xs uppercase text-muted-foreground">Total download</p>
                <p className="mt-1 text-sm font-semibold">{formatBytes(totalDownloadBytes)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Auto-load model on startup</p>
                <p className="text-xs text-muted-foreground">Speeds up first interaction after app launch.</p>
              </div>
              <Switch checked={autoLoadModel} onCheckedChange={setAutoLoadModel} />
            </div>

            {(isInstalling || isLoadingEngine) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{loadProgress.text}</span>
                  <span>{Math.round(loadProgress.progress * 100)}%</span>
                </div>
                <Progress value={Math.round(loadProgress.progress * 100)} />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Setup failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              By continuing, you confirm that resources are stored locally and can be cleared from browser storage.
            </p>
            <Button
              type="button"
              onClick={handleInstall}
              disabled={!isOnline || isInstalling || isLoadingEngine || !selectedModelId || runtimeCompatibility.status === 'unsupported'}
              className="w-full sm:w-auto"
            >
              {isInstalling || isLoadingEngine ? (
                <>
                  <Layers className="mr-2 size-4 animate-spin" />
                  Installing…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Install and Start Citadel Chat
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
