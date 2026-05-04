import UnoCSS from 'unocss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import civetVitePlugin from '@danielx/civet/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [UnoCSS(), civetVitePlugin({ outputExtension: '.svelte.js', ts: 'esbuild' }), sveltekit()],
	optimizeDeps: {
		entries: []
	}
});
