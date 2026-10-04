import { mount } from 'svelte';
import 'virtual:uno.css';
import { initTheme } from './lib/theme.js';
import './app.css';
import favicon from './lib/assets/favicon.svg';
import App from './App.svelte';

// apply the saved theme before mounting so there's no flash
initTheme();

const icon = document.createElement('link');
icon.rel = 'icon';
icon.href = favicon;
document.head.appendChild(icon);

export default mount(App, { target: document.getElementById('app') });
