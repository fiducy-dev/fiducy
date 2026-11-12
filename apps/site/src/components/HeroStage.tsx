import { EnclaveCanvas } from '@/components/EnclaveCanvas';

export function HeroStage() {
  return (
    <div
      className="relative -mr-(--bleed) h-[clamp(380px,100vw,460px)] animate-fade-in overflow-hidden [--bleed:calc(var(--spacing-gutter)+max(16px,(100vw-1200px)/2)+1px)] md:-my-20 md:h-auto md:min-h-[540px] md:self-stretch"
      aria-hidden="true"
    >
      <EnclaveCanvas />
    </div>
  );
}
