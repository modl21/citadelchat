import { useEffect, useMemo, useState } from 'react';

import { useCitadel } from '@/contexts/CitadelContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { KNOWLEDGE_PACKS } from '@/lib/knowledge-packs';
import { filterModelsForDevice, formatBytes } from '@/lib/webllm-models';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

interface SetupWizardProps {
  onComplete: () => void;
}

type WizardStep = 1 | 2 | 3;

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const {
    availableModels,
    benchmarkResult,
    completeInitialSetup,
    hasWebGpu,
    isBenchmarkRunning,
    isLoadingEngine,
    isOnline,
    loadProgress,
    runOnboardingBenchmark,
    runtimeCompatibility,
    runtimeModelSupport,
  } = useCitadel();
  const isMobile = useIsMobile();

  const modelsToOffer = useMemo(
    () => filterModelsForDevice(
      availableModels.filter(model => runtimeModelSupport[model.id] !== false),
      isMobile,
    ),
    [availableModels, runtimeModelSupport, isMobile],
  );

  const defaultPackIds = useMemo(
    () => KNOWLEDGE_PACKS.map(pack => pack.id),
    [],
  );

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedModelId, setSelectedModelId] = useState(
    modelsToOffer.find(model => model.recommended)?.id ?? modelsToOffer[0]?.id ?? '',
  );
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>(defaultPackIds);
  const [autoLoadModel, setAutoLoadModel] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modelsToOffer.some(model => model.id === selectedModelId)) {
      setSelectedModelId(modelsToOffer[0]?.id ?? '');
    }
  }, [modelsToOffer, selectedModelId]);

  const selectedModel = useMemo(
    () => modelsToOffer.find(model => model.id === selectedModelId),
    [modelsToOffer, selectedModelId],
  );

  const totalKnowledgeBytes = useMemo(
    () => KNOWLEDGE_PACKS
      .filter(pack => selectedPackIds.includes(pack.id))
      .reduce((sum, pack) => sum + pack.sizeBytes, 0),
    [selectedPackIds],
  );

  const totalDownloadBytes = (selectedModel?.sizeBytes ?? 0) + totalKnowledgeBytes;

  const hasAllKnowledgePacksSelected = useMemo(
    () => KNOWLEDGE_PACKS.every(pack => selectedPackIds.includes(pack.id)),
    [selectedPackIds],
  );

  function togglePack(packId: string, enabled: boolean) {
    setSelectedPackIds((current) => {
      if (enabled) {
        return Array.from(new Set([...current, packId]));
      }
      return current.filter(id => id !== packId);
    });
  }

  function handleToggleAllKnowledgePacks(enabled: boolean) {
    setSelectedPackIds(enabled ? KNOWLEDGE_PACKS.map(pack => pack.id) : []);
  }

  async function handleRunBenchmark() {
    setBenchmarkError(null);

    try {
      const result = await runOnboardingBenchmark();
      setSelectedModelId(result.recommendedModelId);
    } catch (benchmarkRunError) {
      const message = benchmarkRunError instanceof Error ? benchmarkRunError.message : 'Benchmark failed.';
      setBenchmarkError(message);
    }
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

  const nextDisabled = step === 1 ? !selectedModelId : false;
  const installDisabled =
    !isOnline
    || isInstalling
    || isLoadingEngine
    || !selectedModelId
    || runtimeCompatibility.status === 'unsupported';

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {(isInstalling || isLoadingEngine) && (
        <div className="fixed inset-x-0 top-0 z-50 h-px bg-border/60">
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(loadProgress.progress * 100)}%` }}
          />
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 pb-8 pt-10 md:px-10 md:pt-14">
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <a
              href="https://citadelwire.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-border/70 p-0.5 transition-colors hover:border-primary"
              aria-label="Citadel"
            >
              <img src="/citadel-logo.jpg" alt="Citadel" className="h-8 w-8 rounded-full object-cover" />
            </a>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg md:text-xl">citadel chat: offline citadel knowledge base</h1>
          </div>

          <a
            href="https://odell.xyz"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <img src="/odell-badge.jpg" alt="ODELL" className="h-5 w-5 rounded-full object-cover" />
            <span>curated by ODELL</span>
          </a>
        </div>

        <p className="font-mono text-[11px] text-muted-foreground">step {step} of 3</p>

        <div className="mt-8 flex flex-1 flex-col justify-center">
          {step === 1 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">choose your model</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                pick a local model for offline chat. you can switch models later in settings.
              </p>
              {isMobile && (
                <p className="mt-2 text-xs text-muted-foreground">more powerful models available on desktop</p>
              )}

              <button
                type="button"
                onClick={() => void handleRunBenchmark()}
                disabled={isBenchmarkRunning || runtimeCompatibility.status === 'unsupported'}
                className="mt-5 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBenchmarkRunning ? 'optimizing for this device…' : 'optimize for this device'}
              </button>

              {benchmarkResult && (
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  score {benchmarkResult.score} · {benchmarkResult.tier} tier · recommended {modelsToOffer.find(model => model.id === benchmarkResult.recommendedModelId)?.name ?? benchmarkResult.recommendedModelId}
                </p>
              )}

              {benchmarkError && <p className="mt-2 text-xs text-destructive">{benchmarkError}</p>}

              <ul className="mt-7 divide-y divide-border/70 border-y border-border/70">
                {modelsToOffer.map(model => {
                  const selected = model.id === selectedModelId;

                  return (
                    <li key={model.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedModelId(model.id)}
                        className={cn(
                          'relative w-full px-0 py-4 text-left transition-colors hover:bg-foreground/[0.02]',
                          selected && 'bg-foreground/[0.03]',
                        )}
                      >
                        {selected && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
                        <div className="pl-4">
                          <p className="text-sm font-medium">{model.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
                          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                            {model.sizeLabel} · {model.speed} · {model.quality}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {step === 2 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">select knowledge packs</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                choose the offline references you want available in chat.
              </p>

              <div className="mt-6 flex items-center justify-between border-b border-border/70 pb-3">
                <p className="text-sm">select all knowledge packs</p>
                <Switch
                  checked={hasAllKnowledgePacksSelected}
                  onCheckedChange={handleToggleAllKnowledgePacks}
                  aria-label="Select all knowledge packs"
                />
              </div>

              <ul className="mt-2 divide-y divide-border/70 border-y border-border/70">
                {KNOWLEDGE_PACKS.map(pack => {
                  const enabled = selectedPackIds.includes(pack.id);

                  return (
                    <li key={pack.id}>
                      <label className="flex cursor-pointer gap-3 px-0 py-4">
                        <Checkbox
                          checked={enabled}
                          onCheckedChange={(checked) => togglePack(pack.id, Boolean(checked))}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium">{pack.title}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">{pack.description}</span>
                          <span className="mt-2 block font-mono text-[11px] text-muted-foreground">
                            {pack.sizeLabel} · {pack.docCount} docs
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {step === 3 && (
            <section>
              <h1 className="text-2xl font-semibold tracking-tight">ready to install</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedModel?.name ?? 'No model selected'} with {selectedPackIds.length} knowledge pack{selectedPackIds.length === 1 ? '' : 's'} ({formatBytes(totalDownloadBytes)} total).
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 py-3">
                  <div>
                    <p className="text-sm">auto-load model on startup</p>
                    <p className="text-xs text-muted-foreground">Start ready for immediate chat after launch.</p>
                  </div>
                  <Switch checked={autoLoadModel} onCheckedChange={setAutoLoadModel} />
                </div>

                <p className="text-xs text-muted-foreground">{runtimeCompatibility.headline}. {runtimeCompatibility.detail}</p>
                {!hasWebGpu && <p className="text-xs text-muted-foreground">WebGPU is not detected. Performance may be reduced on this device.</p>}
                {!isOnline && <p className="text-xs text-muted-foreground">You are offline. Reconnect briefly to download selected resources.</p>}
                {runtimeCompatibility.status === 'unsupported' && (
                  <p className="text-xs text-destructive">This browser/runtime cannot install local models safely right now.</p>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                {(isInstalling || isLoadingEngine) && <p className="font-mono text-[11px] text-muted-foreground">{loadProgress.text}</p>}
              </div>
            </section>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 1 || isInstalling || isLoadingEngine}
            onClick={() => setStep((current) => Math.max(1, current - 1) as WizardStep)}
          >
            back
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              size="sm"
              disabled={nextDisabled || isInstalling || isLoadingEngine}
              onClick={() => setStep((current) => Math.min(3, current + 1) as WizardStep)}
            >
              continue
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={installDisabled}
              onClick={() => void handleInstall()}
            >
              {isInstalling || isLoadingEngine ? 'installing…' : 'install and start'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
