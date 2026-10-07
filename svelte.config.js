import { sveltePreprocess } from 'svelte-preprocess-with-civet';

export default {
	preprocess: sveltePreprocess({
		civet: { sync: true },
		typescript: { reportDiagnostics: false }
	}),
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	}
};
