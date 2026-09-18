import type { Metadata } from 'next';

import { Toaster } from '@qavio/ui';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Qavio',
    template: '%s · Qavio',
  },
  description: 'Better Quality. Faster Releases.',
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('qavio-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Runs before paint so the stored theme preference (Settings > Preferences) applies with no flash of the wrong theme. suppressHydrationWarning on <html> is the standard fix for the resulting data-theme attribute mismatch — React only skips warning for this one element's attributes, not its subtree. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
