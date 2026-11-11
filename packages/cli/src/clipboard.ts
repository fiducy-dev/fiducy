import { spawnSync } from 'node:child_process';

const CLIPBOARD_TIMEOUT_MILLISECONDS = 2000;

function listClipboardCommands(environment: Record<string, string | undefined>): string[][] {
  if (process.platform === 'darwin') return [['pbcopy']];
  if (process.platform === 'win32') return [['clip']];
  const wayland = environment.WAYLAND_DISPLAY ? [['wl-copy']] : [];
  return [...wayland, ['xclip', '-selection', 'clipboard'], ['xsel', '--clipboard', '--input']];
}

function tryCopy([command, ...args]: string[], text: string): boolean {
  const result = spawnSync(command ?? '', args, {
    input: text,
    stdio: ['pipe', 'ignore', 'ignore'],
    timeout: CLIPBOARD_TIMEOUT_MILLISECONDS
  });
  return !result.error && result.status === 0;
}

export function copyToClipboard(
  text: string,
  environment: Record<string, string | undefined>
): boolean {
  return listClipboardCommands(environment).some((command) => tryCopy(command, text));
}
