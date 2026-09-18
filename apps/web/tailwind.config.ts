import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [require('@qavio/ui/tailwind.preset.js')],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
