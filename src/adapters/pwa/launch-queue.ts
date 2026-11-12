import type { PickedFile } from '@app/workspace/workspace-provider';

interface LaunchParams {
  readonly files: readonly FileSystemFileHandle[];
}
type LaunchWindow = Window & { launchQueue?: { setConsumer(fn: (p: LaunchParams) => void): void } };

/** Files opened with Asm8 from the operating system (installed app, File Handling API). */
export function onLaunchFiles(handler: (files: PickedFile[]) => void): void {
  const queue = (window as LaunchWindow).launchQueue;
  queue?.setConsumer(async (params) => {
    if (!params.files.length) return;
    const files = await Promise.all(
      params.files.map(async (h) => ({ name: h.name, text: await (await h.getFile()).text() })),
    );
    handler(files);
  });
}
