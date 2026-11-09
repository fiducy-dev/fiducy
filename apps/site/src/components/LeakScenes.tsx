import { QuietLine } from '@/components/Emphasis';
import { IsoScene } from '@/components/IsoScene';
import { Callout } from '@/components/isoCallout';
import { IsoKey, KEY_SHAFT_DEPTH, KEY_SHAFT_OFFSET } from '@/components/isoKey';
import { KEY_SPLIT_AT, KEY_TIP_END } from '@/components/isoKey';
import { Box, Line, Plate, offset } from '@/components/isometric';
import { ISO_DETAIL, ISO_GHOST, ISO_LINE_STRONG } from '@/lib/isoStyles';
import { ISO_SCREEN, ISO_SCROLL, ISO_SLOT } from '@/lib/isoStyles';
import { ISO_RESULT, ISO_STEAL } from '@/lib/isoStyles';
import { DESCRIPTION_CLASS, LABEL_CLASS } from '@/lib/styles';

import type { LeakCardProps, LeakScene } from '@/types';
import type { CSSProperties } from 'react';

function moves(variables: Record<string, string>): CSSProperties {
  return variables as CSSProperties;
}

const LOG_LINE_LENGTHS = [5.2, 3.6, 4.4, 2.8, 5.6, 3.2, 4.8, 2.4];
const HANDLE_SLOTS: [number, number][] = [
  [0.6, 0.7],
  [2.4, 0.7],
  [4.2, 0.7],
  [0.6, 2.6],
  [4.2, 2.6],
  [0.6, 4.5],
  [2.4, 4.5],
  [4.2, 4.5]
];

function DatabaseScene() {
  return (
    <>
      <Plate at={[-1.5, -1.5, 0]} size={[9, 9]} className={ISO_GHOST} />
      {[0, 1.5, 3].map((z) => (
        <Box key={z} at={[0, 0, z]} size={[6, 6, 1.1]}>
          <Line from={[0.6, 6, z + 0.55]} to={[1.6, 6, z + 0.55]} className={ISO_DETAIL} />
          <Line from={[6, 0.6, z + 0.55]} to={[6, 1.2, z + 0.55]} className={ISO_DETAIL} />
        </Box>
      ))}
      {HANDLE_SLOTS.map(([x, y]) => (
        <Box key={`${x}-${y}`} at={[x, y, 4.1]} size={[1.2, 0.8, 0.25]} />
      ))}
      <Plate at={[2.4, 2.6, 4.1]} size={[1.2, 0.8]} className={ISO_GHOST} />
      <g className={ISO_STEAL} style={moves({ '--to': offset(0, 0, 3.4) })}>
        <Box at={[2.4, 2.6, 4.1]} size={[1.2, 0.8, 0.25]} tone="solid" />
      </g>
      <Callout at={[3, 3, 4.1]} to={[105, -30]} name="handle" value="kh_9f2c…" />
      <Callout at={[6, 3, 2.05]} to={[105, 40]} name="api keys stored" value="0" />
    </>
  );
}

function LogsScene() {
  return (
    <>
      <Box at={[0, 0, 0]} size={[8, 5.6, 0.8]} />
      <Plate at={[0.5, 0.5, 0.8]} size={[7, 4.6]} className={ISO_SCREEN} />
      <clipPath id="leak-log-screen">
        <Plate at={[0.5, 0.5, 0.8]} size={[7, 4.6]} />
      </clipPath>
      <g clipPath="url(#leak-log-screen)">
        <g
          className={ISO_SCROLL}
          style={moves({ '--step': offset(0, -LOG_LINE_LENGTHS.length * 0.55, 0) })}
        >
          {[...LOG_LINE_LENGTHS, ...LOG_LINE_LENGTHS].map((length, index) => {
            const y = 1 + index * 0.55;
            return (
              <Line key={y} from={[1, y, 0.8]} to={[1 + length, y, 0.8]} className={ISO_DETAIL} />
            );
          })}
        </g>
        <g className={ISO_STEAL} style={moves({ '--to': offset(0, 3.6, 0) })}>
          <Line from={[0.5, 0.8, 0.8]} to={[7.5, 0.8, 0.8]} className={ISO_LINE_STRONG} />
        </g>
      </g>
      <Callout at={[2, 1.55, 0.8]} to={[128, -8]} name="handle" value="kh_9f2c…" />
      <Callout at={[5, 3.5, 0.8]} to={[128, 48]} name="keys in logs" value="0" />
    </>
  );
}

function StorageScene() {
  return (
    <>
      <Plate at={[-1, -1.2, 0]} size={[7.4, 4.2]} className={ISO_GHOST} />
      <IsoKey at={[0, 0, 0]} part="bow" />
      <Plate
        at={[KEY_SPLIT_AT, KEY_SHAFT_OFFSET, 0]}
        size={[KEY_TIP_END - KEY_SPLIT_AT, KEY_SHAFT_DEPTH]}
        className={ISO_GHOST}
      />
      <Line
        from={[KEY_SPLIT_AT, -0.3, 0.35]}
        to={[KEY_SPLIT_AT, 2.3, 0.35]}
        className={ISO_GHOST}
      />
      <g className={ISO_STEAL} style={moves({ '--to': offset(1.4, 2.4, 1.2) })}>
        <IsoKey at={[0, 0, 0]} part="tip" tone="solid" />
      </g>
      <Callout at={[0.8, 0.8, 0.3]} to={[96, -30]} name="half A" value="your handle" />
      <Callout at={[4.1, 1.25, 0]} to={[96, 30]} name="half B shows" value="0 of 256 bits" />
    </>
  );
}

function EnclaveScene() {
  return (
    <>
      <Plate at={[-1, -1, 0]} size={[6.5, 6.5]} className={ISO_GHOST} />
      <Box at={[0, 0, 0]} size={[4.5, 4.5, 3.4]}>
        <Plate at={[2.4, 1.9, 3.4]} size={[2, 0.8]} className={ISO_SLOT} />
        <Line from={[0.5, 4.5, 2.8]} to={[2.2, 4.5, 2.8]} className={ISO_DETAIL} />
        <Line from={[0.5, 4.5, 2.4]} to={[1.4, 4.5, 2.4]} className={ISO_DETAIL} />
        <Line from={[4.5, 0.5, 2.8]} to={[4.5, 1.6, 2.8]} className={ISO_DETAIL} />
      </Box>
      <g className={ISO_STEAL} style={moves({ '--to': offset(0, 0, -1.9) })}>
        <IsoKey at={[-0.8, 1.5, 5.6]} tone="solid" />
      </g>
      <Callout at={[4.5, 2.25, 1.7]} to={[100, 45]} name="KMS key" value="locked to PCR0" />
      <Callout
        at={[3.4, 2.3, 3.4]}
        to={[100, -24]}
        name="admin"
        value="Decrypt denied"
        className={ISO_RESULT}
      />
    </>
  );
}

const SCENES: LeakScene[] = [
  {
    label: 'Your database',
    hint: 'A handle is stolen',
    readout: 'handles stolen 1 · keys opened 0',
    title: 'If your database leaks,',
    quiet: 'attackers open 0 keys.',
    accent: '0',
    description: 'Each handle needs the enclave and your app secret before it opens anything.',
    scene: <DatabaseScene />
  },
  {
    label: 'Your server logs',
    hint: 'The logs are searched',
    readout: 'grep sk- · 0 matches',
    title: 'If your logs leak,',
    quiet: 'grep finds 0 keys in them.',
    accent: '0',
    description: 'Keys go from the widget straight to the enclave and never pass your server.',
    scene: <LogsScene />
  },
  {
    label: "Fiducy's storage",
    hint: 'Half a key is stolen',
    readout: 'halves stolen 1 of 2',
    title: 'If Fiducy is breached,',
    quiet: 'half a key reveals 0 bits.',
    accent: '0',
    description:
      'Each key is split in two. The other half lives only in your handle, and one half alone says nothing about the key.',
    scene: <StorageScene />
  },
  {
    label: 'An AWS admin',
    hint: 'An admin tries to decrypt',
    readout: 'kms:Decrypt · AccessDenied',
    title: 'Even an AWS admin',
    quiet: "decrypts 0 of your users' keys.",
    accent: '0',
    description: 'KMS unwraps only for the attested enclave image, and nothing is stored open.',
    scene: <EnclaveScene />
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
