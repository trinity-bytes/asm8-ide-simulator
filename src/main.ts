import { mount } from 'svelte';
import './ui/theme/base.css';
import App from './ui/App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app root');

export default mount(App, { target });
