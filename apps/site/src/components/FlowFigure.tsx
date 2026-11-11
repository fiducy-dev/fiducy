import { memo } from 'react';

import { Animate } from '@/components/Animate';
import { Callout } from '@/components/isoCallout';
import { Dot, Inset, Print, RoundBox } from '@/components/isoSolids';
import { Line } from '@/components/isometric';
import { ENCLAVE_BLINK, ENCLAVE_OPEN_BLINK, FLOW_WINDOWS, PROVIDER_BLINK } from '@/lib/flowFigure';
import { WIPE_FLASH, callFrames, halfFrames, keyFrames, replyFrames } from '@/lib/flowFigure';
import { station } from '@/lib/flowFigure';
import { ISO_DETAIL, ISO_DETAIL_FACE, ISO_FLASH, ISO_GHOST, ISO_LED } from '@/lib/isoStyles';
import { ISO_PRINT_INVERSE, ISO_PRINT_QUIET } from '@/lib/isoStyles';

import type { FlowChipProps, FlowFigureProps, Point } from '@/types';

const ENCLAVE_SIZE = 3.4;
const ENCLAVE_HEIGHT = 1.8;
const DISC_LEVELS = [0, 0.7, 1.4];
const RACK_LEVELS = [0, 0.7, 1.4];
const STACK_TOP = 2.1;
const CHIP = 1.1;
const CHIP_HEIGHT = 0.12;

function corner([x, y]: Point, size: number, z = 0): Point {
  return [x - size / 2, y - size / 2, z];
}

function top([x, y]: Point, z: number): Point {
  return [x, y, z];
}

function Chip({ at, label, isSolid }: FlowChipProps) {
  return (
    <>
      <RoundBox
        at={corner(at, CHIP, at[2])}
        size={[CHIP, CHIP, CHIP_HEIGHT]}
        radius={0.2}
        tone={isSolid ? 'solid' : 'line'}
      />
      <Print
        at={[at[0] - 0.15, at[1] + 0.35, at[2] + CHIP_HEIGHT]}
        size={5}
        className={isSolid ? ISO_PRINT_INVERSE : undefined}
      >
        {label}
      </Print>
    </>
  );
}

export const FlowFigure = memo(function FlowFigure({ layout }: FlowFigureProps) {
  const browser = station(layout, 0);
  const enclave = station(layout, 1);
  const database = station(layout, 2, -3);
  const store = station(layout, 2, 3);
  const provider = station(layout, 3);
  const keyHome = top(browser, 0.3);
  const enclaveTop = top(enclave, ENCLAVE_HEIGHT);
  const databaseTop = top(database, STACK_TOP);
  const storeTop = top(store, STACK_TOP);
  const providerTop = top(provider, 1.2);
  const { callouts } = layout;

  return (
    <>
      <Line from={browser} to={enclave} className={ISO_GHOST} />
      <Line from={enclave} to={database} className={ISO_GHOST} />
      <Line from={enclave} to={store} className={ISO_GHOST} />
      <Line from={enclave} to={provider} className={ISO_GHOST} />

      <RoundBox at={corner(browser, 3.2)} size={[3.2, 3.2, 0.3]} radius={0.35}>
        <Inset
          at={[browser[0] - 1.1, browser[1] - 1.1, 0.3]}
          size={[2.2, 2.2]}
          radius={0.2}
          className={ISO_DETAIL_FACE}
        />
      </RoundBox>
      <Print at={[browser[0] + 1.3, browser[1] + 1.75, 0]} face="front" size={6}>
        key box
      </Print>

      <RoundBox
        at={corner(enclave, ENCLAVE_SIZE)}
        size={[ENCLAVE_SIZE, ENCLAVE_SIZE, ENCLAVE_HEIGHT]}
        radius={0.45}
        tone="solid"
      >
        <Animate frames={WIPE_FLASH}>
          <Inset
            at={[enclave[0] - 1.2, enclave[1] - 1.2, ENCLAVE_HEIGHT]}
            size={[2.4, 2.4]}
            radius={0.3}
            className={ISO_FLASH}
          />
        </Animate>
        <Animate frames={ENCLAVE_BLINK}>
          <Dot at={[enclave[0] + 1.3, enclave[1] + 1.7, 1.2]} className="fill-white stroke-none" />
        </Animate>
        <Animate frames={ENCLAVE_OPEN_BLINK}>
          <Dot at={[enclave[0] + 0.7, enclave[1] + 1.7, 1.2]} className="fill-white stroke-none" />
        </Animate>
      </RoundBox>
      <Print
        at={[enclave[0] - 0.4, enclave[1] + 1.1, ENCLAVE_HEIGHT]}
        className={ISO_PRINT_INVERSE}
      >
        enclave
      </Print>

      {DISC_LEVELS.map((z) => (
        <RoundBox key={z} at={corner(database, 3, z)} size={[3, 3, 0.55]} radius={1.5} />
      ))}
      <Print at={[database[0] + 1.25, database[1] + 1.5, 0.2]} face="front" size={6}>
        your db
      </Print>

      {RACK_LEVELS.map((z) => (
        <RoundBox key={z} at={corner(store, 3, z)} size={[3, 3, 0.55]} radius={0.25}>
          <Line
            from={[store[0] - 1.1, store[1] + 1.5, z + 0.28]}
            to={[store[0] - 0.2, store[1] + 1.5, z + 0.28]}
            className={ISO_DETAIL}
          />
        </RoundBox>
      ))}
      <Print at={[store[0] + 1.5, store[1] - 1.3, 0.2]} face="side" size={6}>
        key store
      </Print>

      <RoundBox at={corner(provider, 2.8)} size={[2.8, 2.8, 1.2]} radius={0.4}>
        <Animate frames={PROVIDER_BLINK}>
          <Dot at={[provider[0] + 0.9, provider[1] + 1.4, 0.6]} className={ISO_LED} />
        </Animate>
      </RoundBox>
      <Print at={[provider[0] - 0.3, provider[1] + 0.9, 1.2]} className={ISO_PRINT_QUIET}>
        openai
      </Print>

      <Animate frames={keyFrames(keyHome, enclaveTop)}>
        <Chip at={keyHome} label="sk-" isSolid />
      </Animate>
      <Animate frames={halfFrames(databaseTop, enclaveTop)}>
        <Chip at={databaseTop} label="A" />
      </Animate>
      <Animate frames={halfFrames(storeTop, enclaveTop)}>
        <Chip at={storeTop} label="B" isSolid />
      </Animate>
      <Animate frames={callFrames(enclaveTop, providerTop)}>
        <Chip at={enclaveTop} label="call" isSolid />
      </Animate>
      <Animate frames={replyFrames(providerTop, enclaveTop)}>
        <Chip at={providerTop} label="200" />
      </Animate>

      <Callout
        at={keyHome}
        to={callouts.browser}
        name="key box"
        value="sk-proj-a81f…"
        window={FLOW_WINDOWS.browser}
      />
      <Callout
        at={enclaveTop}
        to={callouts.split}
        name="enclave"
        value="splits it"
        window={FLOW_WINDOWS.split}
      />
      <Callout
        at={enclaveTop}
        to={callouts.open}
        name="enclave"
        value="opens it, 1 call"
        window={FLOW_WINDOWS.open}
      />
      <Callout
        at={databaseTop}
        to={callouts.database}
        name="your db"
        value="half A"
        window={FLOW_WINDOWS.database}
      />
      <Callout
        at={storeTop}
        to={callouts.store}
        name="key store"
        value="half B, sealed"
        window={FLOW_WINDOWS.store}
      />
      <Callout
        at={providerTop}
        to={callouts.provider}
        name="openai"
        value="200 OK"
        window={FLOW_WINDOWS.provider}
      />
    </>
  );
});
