import adapter from '@sveltejs/adapter-static';
import { sveltePreprocess } from 'svelte-preprocess-with-civet';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: sveltePreprocess({
		civet: { sync: true },
		typescript: { reportDiagnostics: false }
	}),
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		paths: { relative: true },
		prerender: { entries: ['*'] }
	}
};

export default config;
