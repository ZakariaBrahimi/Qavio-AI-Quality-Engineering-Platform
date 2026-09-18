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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
