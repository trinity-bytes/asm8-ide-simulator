// Deep imports: the package barrel would compile every icon.
import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
import ArrowUp from '@lucide/svelte/icons/arrow-up';
import BookOpen from '@lucide/svelte/icons/book-open';
import Bug from '@lucide/svelte/icons/bug';
import Check from '@lucide/svelte/icons/check';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronLeft from '@lucide/svelte/icons/chevron-left';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
import CircleAlert from '@lucide/svelte/icons/circle-exclamation-point';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import Copy from '@lucide/svelte/icons/copy';
import Cpu from '@lucide/svelte/icons/cpu';
import Download from '@lucide/svelte/icons/download';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import FilePlus from '@lucide/svelte/icons/file-plus';
import FileText from '@lucide/svelte/icons/file-text';
import Files from '@lucide/svelte/icons/files';
import Folder from '@lucide/svelte/icons/folder';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import FolderPlus from '@lucide/svelte/icons/folder-plus';
import Info from '@lucide/svelte/icons/info';
import Keyboard from '@lucide/svelte/icons/keyboard';
import Menu from '@lucide/svelte/icons/menu';
import Monitor from '@lucide/svelte/icons/monitor';
import Palette from '@lucide/svelte/icons/palette';
import Pause from '@lucide/svelte/icons/pause';
import Pencil from '@lucide/svelte/icons/pencil';
import Play from '@lucide/svelte/icons/play';
import Plus from '@lucide/svelte/icons/plus';
import Redo2 from '@lucide/svelte/icons/redo-2';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
import Search from '@lucide/svelte/icons/search';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import Square from '@lucide/svelte/icons/square';
import StepForward from '@lucide/svelte/icons/step-forward';
import Terminal from '@lucide/svelte/icons/terminal';
import Trash2 from '@lucide/svelte/icons/trash';
import TriangleAlert from '@lucide/svelte/icons/triangle-exclamation-point';
import Upload from '@lucide/svelte/icons/upload';
import WifiOff from '@lucide/svelte/icons/wifi-off';
import X from '@lucide/svelte/icons/x';

/** Every icon the app uses, by role. Lucide geometry, like the Figma "Icons" set. */
export const ICONS = {
  play: Play,
  pause: Pause,
  step: StepForward,
  stepOver: Redo2,
  stepOut: ArrowUp,
  reset: RotateCcw,
  restart: RefreshCw,
  stop: Square,
  explorer: Files,
  search: Search,
  debug: Bug,
  reference: BookOpen,
  settings: SlidersHorizontal,
  file: FileText,
  folder: Folder,
  folderOpen: FolderOpen,
  newFile: FilePlus,
  newFolder: FolderPlus,
  refresh: RefreshCw,
  close: X,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  check: Check,
  plus: Plus,
  more: Ellipsis,
  menu: Menu,
  trash: Trash2,
  rename: Pencil,
  copy: Copy,
  download: Download,
  upload: Upload,
  install: ArrowDownToLine,
  keyboard: Keyboard,
  cpu: Cpu,
  console: Terminal,
  display: Monitor,
  palette: Palette,
  info: Info,
  error: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
  offline: WifiOff,
} as const;

export type IconName = keyof typeof ICONS;
