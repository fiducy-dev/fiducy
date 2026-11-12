import { memo } from 'react';

import { Animate } from '@/components/Animate';
import { Callout } from '@/components/isoCallout';
import { Dot, Inset, Print, RoundBox } from '@/components/isoSolids';
import { Line } from '@/components/isometric';
import { CALL_CLOCK, CALL_WINDOWS, SETUP_CLOCK, SETUP_WINDOWS } from '@/lib/flowFigure';
import {
  FLOW_PROVIDERS,
  PROVIDER_CLOCK,
  providerLabelFrames,
  providerWindow
} from '@/lib/flowFigure';
import { ENCLAVE_BLINK, ENCLAVE_OPEN_BLINK, PROVIDER_BLINK, WIPE_FLASH } from '@/lib/flowFigure';
import { callFrames, fetchFrames, keyFrames, replyFrames, storeFrames } from '@/lib/flowFigure';
import { station } from '@/lib/flowFigure';
import { ISO_DETAIL, ISO_DETAIL_FACE, ISO_FLASH, ISO_GHOST, ISO_LED } from '@/lib/isoStyles';
import { ISO_PRINT_CENTER, ISO_PRINT_INVERSE } from '@/lib/isoStyles';

import type { FlowChipProps, FlowFigureProps, Point } from '@/types';

const ENCLAVE_SIZE = 3.4;
const ENCLAVE_HEIGHT = 1.8;
const DISC_LEVELS = [0, 0.7, 1.4];
const RACK_LEVELS = [0, 0.7, 1.4];
const STACK_TOP = 2.1;
const STACK_LID = 1.95;
const LABEL_SIZE = 6.5;
const CHIP_ASIDE = 0.62;
const PROVIDER_HEIGHT = 1.2;
const CHIP = 1.1;
const CHIP_HEIGHT = 0.12;

function corner([x, y]: Point, size: number, z = 0): Point {
  return [x - size / 2, y - size / 2, z];
}

function top([x, y]: Point, z: number): Point {
  return [x, y, z];
}

function aside([x, y]: Point, z: number): Point {
  return [x - CHIP_ASIDE, y - CHIP_ASIDE, z];
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
  const keyHome = aside(browser, 0.3);
  const enclaveTop = aside(enclave, ENCLAVE_HEIGHT);
  const databaseTop = aside(database, STACK_TOP);
  const storeTop = aside(store, STACK_TOP);
  const providerTop = aside(provider, PROVIDER_HEIGHT);
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
      <Print at={top(browser, 0.3)} size={LABEL_SIZE} className={ISO_PRINT_CENTER}>
        client
      </Print>

      <RoundBox
        at={corner(enclave, ENCLAVE_SIZE)}
        size={[ENCLAVE_SIZE, ENCLAVE_SIZE, ENCLAVE_HEIGHT]}
        radius={0.45}
        tone="solid"
      >
        <Animate frames={WIPE_FLASH} clock={CALL_CLOCK}>
          <Inset
            at={[enclave[0] - 1.2, enclave[1] - 1.2, ENCLAVE_HEIGHT]}
            size={[2.4, 2.4]}
            radius={0.3}
            className={ISO_FLASH}
          />
        </Animate>
        <Animate frames={ENCLAVE_BLINK} clock={SETUP_CLOCK}>
          <Dot at={[enclave[0] + 1.3, enclave[1] + 1.7, 1.2]} className="fill-white stroke-none" />
        </Animate>
        <Animate frames={ENCLAVE_OPEN_BLINK} clock={CALL_CLOCK}>
          <Dot at={[enclave[0] + 0.7, enclave[1] + 1.7, 1.2]} className="fill-white stroke-none" />
        </Animate>
      </RoundBox>
      <Print
        at={top(enclave, ENCLAVE_HEIGHT)}
        size={LABEL_SIZE}
        className={`${ISO_PRINT_INVERSE} ${ISO_PRINT_CENTER}`}
      >
        enclave
      </Print>

      {DISC_LEVELS.map((z) => (
        <RoundBox key={z} at={corner(database, 3, z)} size={[3, 3, 0.55]} radius={1.5} />
      ))}
      <Print at={top(database, STACK_LID)} size={LABEL_SIZE} className={ISO_PRINT_CENTER}>
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
      <Print at={top(store, STACK_LID)} size={LABEL_SIZE} className={ISO_PRINT_CENTER}>
        key store
      </Print>

      <RoundBox at={corner(provider, 2.8)} size={[2.8, 2.8, 1.2]} radius={0.4}>
        <Animate frames={PROVIDER_BLINK} clock={CALL_CLOCK}>
          <Dot at={[provider[0] + 0.9, provider[1] + 1.4, 0.6]} className={ISO_LED} />
        </Animate>
      </RoundBox>
      {FLOW_PROVIDERS.map((name, index) => (
        <Animate key={name} frames={providerLabelFrames(index)} clock={PROVIDER_CLOCK}>
          <Print at={top(provider, PROVIDER_HEIGHT)} size={LABEL_SIZE} className={ISO_PRINT_CENTER}>
            {name}
          </Print>
        </Animate>
      ))}

      <Animate frames={keyFrames(keyHome, enclaveTop)} clock={SETUP_CLOCK}>
        <Chip at={keyHome} label="sk-" isSolid />
      </Animate>
      <Animate frames={storeFrames(databaseTop, enclaveTop)} clock={SETUP_CLOCK}>
        <Chip at={databaseTop} label="A" />
      </Animate>
      <Animate frames={storeFrames(storeTop, enclaveTop)} clock={SETUP_CLOCK}>
        <Chip at={storeTop} label="B" isSolid />
      </Animate>
      <Animate frames={fetchFrames(databaseTop, enclaveTop)} clock={CALL_CLOCK}>
        <Chip at={databaseTop} label="A" />
      </Animate>
      <Animate frames={fetchFrames(storeTop, enclaveTop)} clock={CALL_CLOCK}>
        <Chip at={storeTop} label="B" isSolid />
      </Animate>
      <Animate frames={callFrames(enclaveTop, providerTop)} clock={CALL_CLOCK}>
        <Chip at={enclaveTop} label="call" isSolid />
      </Animate>
      <Animate frames={replyFrames(providerTop, enclaveTop)} clock={CALL_CLOCK}>
        <Chip at={providerTop} label="200" />
      </Animate>

      <Callout
        at={keyHome}
        to={callouts.browser}
        name="client"
        value="sk-…a81f"
        window={SETUP_WINDOWS.browser}
        clock={SETUP_CLOCK}
      />
      <Callout
        at={enclaveTop}
        to={callouts.split}
        name="enclave"
        value="splits it"
        window={SETUP_WINDOWS.split}
        clock={SETUP_CLOCK}
      />
      <Callout
        at={enclaveTop}
        to={callouts.open}
        name="enclave"
        value="opens it, 1 call"
        window={CALL_WINDOWS.open}
        clock={CALL_CLOCK}
      />
      <Callout
        at={databaseTop}
        to={callouts.database}
        name="your db"
        value="half A"
        window={SETUP_WINDOWS.database}
        clock={SETUP_CLOCK}
      />
      <Callout
        at={storeTop}
        to={callouts.store}
        name="key store"
        value="half B, sealed"
        window={SETUP_WINDOWS.store}
        clock={SETUP_CLOCK}
      />
      {FLOW_PROVIDERS.map((name, index) => (
        <Callout
          key={name}
          at={providerTop}
          to={callouts.provider}
          name={name}
          value="200 OK"
          window={providerWindow(index)}
          clock={PROVIDER_CLOCK}
        />
      ))}
    </>
  );
});
