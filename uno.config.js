import { defineConfig, presetWind4, presetIcons } from 'unocss';

export default defineConfig({
  theme: {
    colors: {
      ef: {
        bg: {
          DEFAULT: '#333c43',
          deep:    '#293136',
          deeper:  '#222a2f',
        },
        border:  '#4d5960',
        text: {
          DEFAULT: '#D3C6AA',
          dim:     '#9DA9A0',
          muted:   '#859289',
        },
        accent: {
          DEFAULT: '#A7C080',
          hover:   '#B5CC95',
        },
        green:   '#83C092',
        red:     '#E67E80',
        error:   '#E67E80',
        tab: {
          active: '#434f55',
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
