export type SideView = 'explorer' | 'search' | 'debug' | 'reference';
export type PanelTab = 'console' | 'problems' | 'display' | 'writes' | 'machine';
export type Layout = 'desktop' | 'tablet-landscape' | 'tablet-portrait' | 'phone';
export type PhoneRegion = 'code' | 'machine' | 'console' | 'files' | 'more';
export type Overlay =
  | { readonly kind: 'palette'; readonly mode: 'commands' | 'files' }
  | { readonly kind: 'shortcuts' }
  | { readonly kind: 'themes' }
  | { readonly kind: 'about' }
  | null;

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: 'info' | 'positive' | 'negative';
  readonly action?: { readonly label: string; readonly run: () => void };
}

export interface ConfirmRequest {
  readonly title: string;
  readonly body: string;
  readonly confirm: string;
  readonly danger?: boolean;
  /** Optional third button (e.g. "Don't save"). */
  readonly alternate?: string;
  readonly resolve: (choice: 'confirm' | 'alternate' | 'cancel') => void;
}

export interface MenuItemSpec {
  readonly label: string;
  readonly shortcut?: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  /** Radio-style menus (speed): draws a check mark. */
  readonly checked?: boolean;
  readonly run: () => void;
}

export interface ContextMenuRequest {
  readonly x: number;
  readonly y: number;
  readonly items: readonly (MenuItemSpec | 'separator')[];
}

/** Container: layout, open views, overlays, toasts and dialogs. */
export class UiState {
  sideView = $state<SideView | null>('explorer');
  panelTab = $state<PanelTab>('console');
  layout = $state<Layout>('desktop');
  /** Tablet landscape: Machine drawer. */
  machineDrawer = $state(false);
  /** Tablet portrait: explorer sheet. */
  filesSheet = $state(false);
  phoneRegion = $state<PhoneRegion>('code');
  overlay = $state<Overlay>(null);
  toasts = $state<Toast[]>([]);
  confirmRequest = $state<ConfirmRequest | null>(null);
  contextMenu = $state<ContextMenuRequest | null>(null);
  /** Line actions sheet on the phone (long-press on a line number). */
  lineSheet = $state<number | null>(null);
  /** Search query shared by the Search view. */
  searchQuery = $state('');
  online = $state(true);
  private nextToast = 1;

  toggleSideView(view: SideView): void {
    this.sideView = this.sideView === view ? null : view;
  }

  toast(text: string, tone: Toast['tone'] = 'info', action?: Toast['action'], ms = 4000): void {
    const id = this.nextToast++;
    this.toasts.push({ id, text, tone, ...(action ? { action } : {}) });
    if (this.toasts.length > 3) this.toasts.shift();
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  confirm(req: Omit<ConfirmRequest, 'resolve'>): Promise<'confirm' | 'alternate' | 'cancel'> {
    return new Promise((resolve) => {
      this.confirmRequest = {
        ...req,
        resolve: (choice) => {
          this.confirmRequest = null;
          resolve(choice);
        },
      };
    });
  }

  openMenu(x: number, y: number, items: ContextMenuRequest['items']): void {
    this.contextMenu = { x, y, items };
  }
}
