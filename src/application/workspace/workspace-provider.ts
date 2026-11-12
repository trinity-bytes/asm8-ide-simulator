import type { FileSystemPort } from './file-system';

export interface RecentFolder {
  readonly id: string;
  readonly name: string;
  readonly openedAt: number;
}

/** A workspace that was reopened; `granted` is false until the user allows access again. */
export interface RestoredWorkspace {
  readonly fs: FileSystemPort;
  readonly granted: boolean;
}

export interface PickedFile {
  readonly name: string;
  readonly text: string;
}

/** Port: how workspaces are opened, remembered and reopened (browser APIs live in the adapter). */
export interface WorkspaceProvider {
  /** True where real folders can be opened (File System Access, Chromium desktop). */
  readonly canOpenFolders: boolean;
  /** Shows the folder picker. Null when the user cancels. */
  openFolder(): Promise<FileSystemPort | null>;
  /** The private browser workspace (OPFS), available everywhere. */
  browserWorkspace(): Promise<FileSystemPort>;
  examples(): FileSystemPort;
  /** The folder open in the last session, if any. */
  restoreLast(): Promise<RestoredWorkspace | null>;
  openRecent(id: string): Promise<RestoredWorkspace | null>;
  recent(): Promise<RecentFolder[]>;
  forgetRecent(id: string): Promise<void>;
  /** Asks the browser for read/write access again (needs a user gesture). */
  requestAccess(fs: FileSystemPort): Promise<boolean>;
  /** Remembers which workspace is open so it can be restored next time. */
  rememberCurrent(fs: FileSystemPort): Promise<void>;
  /** Lets the user pick .asm files (Open file / Import). */
  pickFiles(): Promise<PickedFile[]>;
  /** Saves text as a download (browsers without folder access). */
  download(name: string, text: string): void;
}
