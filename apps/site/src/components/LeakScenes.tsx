import { Animate } from '@/components/Animate';
import { QuietLine } from '@/components/Emphasis';
import { IsoScene } from '@/components/IsoScene';
import { Callout } from '@/components/isoCallout';
import { Dot, Inset, Print, RoundBox, SidePanel } from '@/components/isoSolids';
import { Line, offset } from '@/components/isometric';
import { blink, motion, shown, track } from '@/lib/isoMotion';
import { ISO_DETAIL, ISO_DETAIL_FACE, ISO_FLASH, ISO_GHOST, ISO_LED } from '@/lib/isoStyles';
import { ISO_LINE_STRONG, ISO_PRINT_INVERSE, ISO_PRINT_QUIET, ISO_SCREEN } from '@/lib/isoStyles';
import { DESCRIPTION_CLASS, LABEL_CLASS } from '@/lib/styles';

import type { LeakCardProps, LeakScene } from '@/types';

const DUMP_ROWS = ['kh_9f2c…', 'kh_41ab…', 'kh_7d0e…'];
const LOG_LINES = [
  'POST /api/chat 200',
  'handle=kh_9f2c…',
  'model=gpt-4o-mini',
  'POST /api/chat 429',
  'handle=kh_41ab…'
];
const DISC_LEVELS = [0, 0.95, 1.9];
const RACK_LEVELS = [0, 0.95, 1.9];

const DUMP_FROM = offset(-3, -1.4, 1.2);
const DUMP_AWAY = offset(2.6, 1.4, 0);
const DUMP_MOTION = motion([
  [300, DUMP_FROM, 0],
  [1300, 'none', 1],
  [5800, 'none', 1],
  [7000, DUMP_AWAY, 0]
]);
const DUMP_ROW_FRAMES = DUMP_ROWS.map((_, index) =>
  shown('opacity', [1400 + index * 350, 5800], [0, 1], 150)
);
const DISC_BLINK = blink(300, 1700);

const LOG_LINE_FRAMES = LOG_LINES.map((_, index) =>
  shown('opacity', [300 + index * 450, 7200], [0, 1], 120)
);
const PROMPT_FRAMES = shown('opacity', [2600, 7200], [0, 1], 120);
const SCAN_MOTION = motion([
  [2900, 'none', 0],
  [3000, 'none', 1],
  [4600, offset(0, 0, -2.6), 1],
  [4700, offset(0, 0, -2.6), 0]
]);

const SHARE_INSIDE = offset(-2.4, 1.2, -0.4);
const SHARE_AWAY = offset(1.6, -1, 1.8);
const SHARE_MOTION = motion([
  [500, SHARE_INSIDE, 0],
  [1500, 'none', 1],
  [5200, 'none', 1],
  [6400, SHARE_AWAY, 0]
]);
const RACK_BLINK = blink(500, 1700);

const BADGE_AT_SLOT = offset(-4.55, 2.2, -1.05);
const BADGE_MOTION = motion([
  [900, 'none', 1],
  [2000, BADGE_AT_SLOT, 1],
  [2300, BADGE_AT_SLOT, 1],
  [3200, 'none', 1],
  [4300, 'none', 1],
  [5100, BADGE_AT_SLOT, 1],
  [5400, BADGE_AT_SLOT, 1],
  [6300, 'none', 1]
]);
const SLOT_FLASH = track('opacity', [
  [2000, 0],
  [2100, 1],
  [2500, 0],
  [5100, 0],
  [5200, 1],
  [5600, 0]
]);
const KMS_BLINK = blink(2000, 2600, 150);

function DatabaseScene() {
  return (
    <>
      <Inset at={[-0.6, -0.6, 0]} size={[9, 6.4]} radius={0.6} className={ISO_GHOST} />
      {DISC_LEVELS.map((z) => (
        <RoundBox key={z} at={[0, 0, z]} size={[3.6, 3.6, 0.75]} radius={1.8}>
          <Animate frames={DISC_BLINK}>
            <Dot at={[3.3, 2.3, z + 0.38]} className={ISO_LED} />
          </Animate>
        </RoundBox>
      ))}
      <Print at={[1.75, 2.85, 2.65]}>app db</Print>
      <Animate frames={DUMP_MOTION}>
        <RoundBox at={[4.2, 2.2, 0]} size={[3.6, 3, 0.14]} radius={0.2} />
        <Print at={[4.75, 4.85, 0.14]} className={ISO_PRINT_QUIET}>
          users
        </Print>
        <Line from={[5, 5, 0.14]} to={[5, 2.4, 0.14]} className={ISO_DETAIL} />
        {DUMP_ROWS.map((row, index) => (
          <Animate key={row} frames={DUMP_ROW_FRAMES[index] ?? []}>
            <Print at={[5.65 + index * 0.6, 4.85, 0.14]}>{row}</Print>
          </Animate>
        ))}
      </Animate>
      <Callout
        at={[2.8, 1.2, 2.65]}
        to={[100, -28]}
        name="api keys"
        value="0"
        window={[200, 7400]}
      />
      <Callout
        at={[7.3, 3.5, 0.14]}
        to={[100, 58]}
        name="dump"
        value="3 handles"
        window={[2600, 5600]}
      />
    </>
  );
}

function LogsScene() {
  return (
    <>
      <Inset at={[-0.6, -0.8, 0]} size={[5.6, 8]} radius={0.6} className={ISO_GHOST} />
      <RoundBox at={[0.35, -0.2, 0]} size={[3.8, 6.4, 0.35]} radius={0.3} />
      <Inset at={[1.4, 0.4, 0.35]} size={[1.8, 5.2]} radius={0.15} className={ISO_DETAIL_FACE} />
      <RoundBox at={[0, 0, 0.35]} size={[0.35, 6, 3.6]} radius={0.12} />
      <SidePanel at={[0.35, 0.3, 0.65]} size={[5.4, 3]} className={ISO_SCREEN} />
      {LOG_LINES.map((line, index) => (
        <Animate key={line} frames={LOG_LINE_FRAMES[index] ?? []}>
          <Print at={[0.35, 5.45, 3.2 - index * 0.5]} face="side" size={5.5}>
            {line}
          </Print>
        </Animate>
      ))}
      <Animate frames={PROMPT_FRAMES}>
        <Print at={[0.35, 5.45, 0.7]} face="side" size={5.5}>
          $ grep sk- app.log
        </Print>
      </Animate>
      <Animate frames={SCAN_MOTION}>
        <Line from={[0.35, 0.3, 3.45]} to={[0.35, 5.7, 3.45]} className={ISO_LINE_STRONG} />
      </Animate>
      <Callout
        at={[0.35, 2.4, 2.75]}
        to={[100, -24]}
        name="app.log"
        value="0 keys"
        window={[800, 7200]}
      />
      <Callout
        at={[0.35, 2.4, 1.25]}
        to={[100, 30]}
        name="grep sk-"
        value="0 matches"
        window={[4700, 7200]}
      />
    </>
  );
}

function StorageScene() {
  return (
    <>
      <Inset at={[-0.6, -0.6, 0]} size={[9, 8.4]} radius={0.6} className={ISO_GHOST} />
      {RACK_LEVELS.map((z) => (
        <RoundBox key={z} at={[0, 0, z]} size={[4.4, 3.2, 0.8]} radius={0.25}>
          <Line from={[0.4, 3.2, z + 0.4]} to={[1.6, 3.2, z + 0.4]} className={ISO_DETAIL} />
          <Animate frames={RACK_BLINK}>
            <Dot at={[3.7, 3.2, z + 0.4]} className={ISO_LED} />
          </Animate>
        </RoundBox>
      ))}
      <Print at={[4.4, 3, 2.2]} face="side" size={5.5}>
        fiducy store
      </Print>
      <RoundBox at={[2.6, 4.6, 0]} size={[1.8, 2.8, 0.12]} radius={0.2} />
      <Print at={[3.65, 6.95, 0.12]}>share A</Print>
      <Animate frames={SHARE_MOTION}>
        <RoundBox at={[6.4, 0.2, 1.4]} size={[1.8, 2.8, 0.12]} radius={0.2} tone="solid" />
        <Print at={[7.45, 2.55, 1.52]} className={ISO_PRINT_INVERSE}>
          share B
        </Print>
      </Animate>
      <Callout
        at={[4, 5, 0.12]}
        to={[118, 70]}
        name="share A"
        value="your handle"
        window={[300, 7400]}
      />
      <Callout
        at={[6.8, 0.6, 1.52]}
        to={[118, 16]}
        name="share B"
        value="0 of 256 bits"
        window={[1700, 5200]}
      />
    </>
  );
}

function AdminScene() {
  return (
    <>
      <Inset at={[-0.6, -0.6, 0]} size={[8.4, 9]} radius={0.6} className={ISO_GHOST} />
      <RoundBox at={[0, 0, 0]} size={[4, 4, 2.6]} radius={0.4}>
        <Inset at={[1.6, 1, 2.6]} size={[0.8, 2]} radius={0.15} className={ISO_DETAIL_FACE} />
        <Animate frames={SLOT_FLASH}>
          <Inset at={[1.6, 1, 2.6]} size={[0.8, 2]} radius={0.15} className={ISO_FLASH} />
        </Animate>
        <Animate frames={KMS_BLINK}>
          <Dot at={[4, 0.6, 2.2]} className={ISO_LED} />
        </Animate>
      </RoundBox>
      <Print at={[4, 2.6, 1.1]} face="side" size={8}>
        KMS
      </Print>
      <RoundBox at={[0.2, 4.6, 0]} size={[2.4, 3.6, 0.12]} radius={0.2} />
      <Print at={[0.85, 7.85, 0.12]} size={5.5} className={ISO_PRINT_QUIET}>
        key policy
      </Print>
      <Print at={[1.45, 7.85, 0.12]} size={5.5}>
        Decrypt if
      </Print>
      <Print at={[2.05, 7.85, 0.12]} size={5.5}>
        PCR0 = 7f3a…
      </Print>
      <Animate frames={BADGE_MOTION}>
        <RoundBox at={[5.8, -1.4, 3.8]} size={[1.5, 2.4, 0.12]} radius={0.2} tone="solid" />
        <Print at={[6.7, 0.7, 3.92]} className={ISO_PRINT_INVERSE}>
          admin
        </Print>
      </Animate>
      <Callout
        at={[2.4, 8.05, 0.12]}
        to={[124, 82]}
        name="policy"
        value="PCR0 only"
        window={[300, 7400]}
      />
      <Callout
        at={[2, 2, 2.6]}
        to={[124, -32]}
        name="kms:Decrypt"
        value="AccessDenied"
        window={[2200, 7000]}
      />
    </>
  );
}

const SCENES: LeakScene[] = [
  {
    label: 'Your database',
    hint: 'The users table is dumped',
    readout: 'rows dumped 3 · keys opened 0',
    title: 'If your database leaks,',
    quiet: 'attackers open 0 keys.',
    accent: '0',
    description: 'Each handle needs the enclave and your app secret before it opens anything.',
    scene: <DatabaseScene />
  },
  {
    label: 'Your server logs',
    hint: 'Someone greps the logs',
    readout: 'log lines 5 · keys 0',
    title: 'If your logs leak,',
    quiet: 'grep finds 0 keys in them.',
    accent: '0',
    description: 'Keys go from the widget straight to the enclave and never pass your server.',
    scene: <LogsScene />
  },
  {
    label: "Fiducy's storage",
    hint: 'The key store is dumped',
    readout: 'shares stolen 1 of 2',
    title: 'If Fiducy is breached,',
    quiet: 'half a key reveals 0 bits.',
    accent: '0',
    description:
      'Each key is split in two. The other half lives only in your handle, and one half alone says nothing about the key.',
    scene: <StorageScene />
  },
  {
    label: 'An AWS admin',
    hint: 'An admin calls Decrypt',
    readout: 'PCR0 required · admin has none',
    title: 'Even an AWS admin',
    quiet: "decrypts 0 of your users' keys.",
    accent: '0',
    description: 'KMS unwraps only for the attested enclave image, and nothing is stored open.',
    scene: <AdminScene />
  }
];

function LeakCard({ leak }: LeakCardProps) {
  return (
    <figure className="group m-0 grid content-start gap-3 border-dashed border-frame px-gutter pt-6 pb-8 outline-none max-md:border-b max-md:last:border-b-0 md:border-b md:odd:border-r md:[&:nth-last-child(-n+2)]:border-b-0">
      <p
        className={`${LABEL_CLASS} flex items-center gap-2.5 before:size-1.5 before:bg-ink group-focus-visible:text-ink group-focus-visible:underline`}
      >
        {leak.label}
      </p>
      <IsoScene>{leak.scene}</IsoScene>
      <div className={`${LABEL_CLASS} flex flex-wrap justify-between gap-x-3 gap-y-1`}>
        <span>{leak.hint}</span>
        <span className="text-ink normal-case tabular-nums">{leak.readout}</span>
      </div>
      <h3 className="text-[clamp(1.25rem,2vw,1.625rem)] leading-[1.2] font-semibold tracking-[-0.035em] text-balance">
        {leak.title}
        <QuietLine text={leak.quiet} word={leak.accent} />
      </h3>
      <p className={`${DESCRIPTION_CLASS} max-w-[46ch]`}>{leak.description}</p>
    </figure>
  );
}

export function LeakScenes() {
  return (
    <div className="-mx-gutter grid border-t border-dashed border-frame md:grid-cols-2">
      {SCENES.map((leak) => (
        <LeakCard key={leak.label} leak={leak} />
      ))}
    </div>
  );
}
