import { useMemo, useState } from 'react';
import { Cpu, HardDriveDownload, Layers, ShieldCheck, Sparkles } from 'lucide-react';

import { useCitadel } from '@/contexts/CitadelContext';
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
    cachedModelStatus,
    completeInitialSetup,
    loadProgress,
    isLoadingEngine,
    hasWebGpu,
    isOnline,
  } = useCitadel();

  const [selectedModelId, setSelectedModelId] = useState(
    availableModels.find(model => model.recommended)?.id ?? availableModels[0]?.id ?? '',
  );
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(
    KNOWLEDGE_PRESETS.find(preset => preset.id === 'starter')?.packIds ?? [],
  );
  const [autoLoadModel, setAutoLoadModel] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => availableModels.find(model => model.id === selectedModelId),
    [availableModels, selectedModelId],
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl animate-fade-in-up">
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
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {availableModels.map(model => {
                  const isSelected = model.id === selectedModelId;
                  const isCached = cachedModelStatus[model.id];

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModelId(model.id)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected && 'border-primary bg-primary/5 shadow-md glow-primary',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-semibold">{model.name}</p>
                        <div className="flex items-center gap-2">
                          {model.recommended && <Badge>Recommended</Badge>}
                          {isCached && <Badge variant="secondary">Cached</Badge>}
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
              disabled={!isOnline || isInstalling || isLoadingEngine || !selectedModelId}
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
