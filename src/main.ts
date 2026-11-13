import { mount } from 'svelte';
import './ui/theme/base.css';
import App from './ui/App.svelte';
import { trackVisualViewport } from './ui/viewport';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app root');

trackVisualViewport();

export default mount(App, { target });
