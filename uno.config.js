import { defineConfig, presetWind4, presetIcons } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      ef: {
        bg: {
          DEFAULT: '#2a302b',
          deep:    '#161a16',
          deeper:  '#0f1310',
        },
        border:  '#48584E',
        text: {
          DEFAULT: '#d8e0c8',
          dim:     '#93B259',
          muted:   '#707668',
        },
        accent: {
          DEFAULT: '#93B259',
          hover:   '#A7C080',
        },
        green:   '#93B259',
        red:     '#E67E80',
        error:   '#E67E80',
        tab: {
          active: '#242a25',
        },
      },
    },
  },
  presets: [
    presetWind4(),
    presetIcons(),
  ],
  preflights: [
    {
      getCSS: () => `
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        button { background: none; cursor: pointer; }
      `,
    },
  ],
});
