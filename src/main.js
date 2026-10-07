import { mount } from 'svelte';
import 'virtual:uno.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './app.css';
import favicon from './lib/assets/favicon.svg';
import App from './App.svelte';

const icon = document.createElement('link');
icon.rel = 'icon';
icon.href = favicon;
document.head.appendChild(icon);

export default mount(App, { target: document.getElementById('app') });
