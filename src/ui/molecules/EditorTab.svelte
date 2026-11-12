<script lang="ts">
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    title: string;
    active: boolean;
    dirty: boolean;
    id: string;
    onselect: () => void;
    onclose: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    ondragstart?: (e: DragEvent) => void;
    ondrop?: (e: DragEvent) => void;
  }
  let { title, active, dirty, id, onselect, onclose, oncontextmenu, ondragstart, ondrop }: Props = $props();
</script>

<div
  class="tab"
  class:active
  role="tab"
  tabindex={active ? 0 : -1}
  aria-selected={active}
  aria-controls="editor-panel"
  id="tab-{id}"
  draggable="true"
  {title}
  onclick={onselect}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onselect();
    }
  }}
  onauxclick={(e) => e.button === 1 && onclose()}
  {oncontextmenu}
  {ondragstart}
  ondragover={(e) => e.preventDefault()}
  {ondrop}
>
  <span class="name">{title}</span>
  <button
    type="button"
    class="close"
    class:dirty
    tabindex="-1"
    aria-label="Close {title}{dirty ? ' (unsaved changes)' : ''}"
    onclick={(e) => {
      e.stopPropagation();
      onclose();
    }}
  >
    <span class="dot" aria-hidden="true"></span>
    <Icon name="close" size={14} />
  </button>
</div>

<style>
  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    height: var(--tab-h);
    padding: 0 10px 0 16px;
    color: var(--color-muted);
    border-right: 1px solid var(--color-border);
    cursor: pointer;
    flex: none;
    user-select: none;
  }
  .tab:hover {
    color: var(--color-text);
  }
  .active {
    color: var(--color-text);
    background: var(--color-surface);
  }
  .active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--color-accent);
  }
  .tab:focus-visible {
    border-radius: 0;
    box-shadow: inset var(--focus-ring);
  }
  .name {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .close {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    color: var(--color-muted);
  }
  .close :global(.icon) {
    grid-area: 1 / 1;
    opacity: 0;
  }
  .dot {
    grid-area: 1 / 1;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-text);
    opacity: 0;
  }
  .close.dirty .dot {
    opacity: 1;
  }
  .active .close :global(.icon),
  .tab:hover .close :global(.icon) {
    opacity: 1;
  }
  .close.dirty:not(:hover) :global(.icon) {
    opacity: 0;
  }
  .close:hover {
    background: var(--color-raised);
    color: var(--color-text);
  }
  .close:hover .dot {
    opacity: 0;
  }
</style>
