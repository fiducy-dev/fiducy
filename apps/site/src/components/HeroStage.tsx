import { EnclaveCanvas } from '@/components/EnclaveCanvas';
import { Badge } from '@/components/ui/badge';

export function HeroStage() {
  return (
    <div
      className="relative h-[clamp(360px,40vw,500px)] animate-fade-in overflow-hidden"
      aria-hidden="true"
    >
      <EnclaveCanvas />
      <Badge
        variant="outline"
        className="pointer-events-none absolute top-0 right-0 max-w-full gap-2 font-mono text-[0.6875rem] uppercase"
      >
        <span className="size-1.5 animate-blink bg-ink" />
        Nitro enclave · attested
      </Badge>
    </div>
  );
}
