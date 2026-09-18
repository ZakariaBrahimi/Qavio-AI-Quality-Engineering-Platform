'use client';

import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@qavio/ui';
import { useEffect, useState } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'qavio-theme';

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.setAttribute('data-theme', resolveTheme(preference));
}

/**
 * Light/dark/system toggle. The CSS tokens for both themes already exist
 * (`:root[data-theme='dark']` in packages/ui/src/styles/theme.css) — this
 * is the first thing that actually sets the attribute. Persisted to
 * localStorage and applied by an inline script in the root layout so
 * there's no flash of the wrong theme on load.
 */
export function ThemePreferenceForm() {
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreference(stored);
      }
    } catch {
      // Storage unavailable (private browsing, blocked cookies) — fall back to the default.
    }
  }, []);

  useEffect(() => {
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  function handleChange(value: string) {
    const next = value as ThemePreference;
    setPreference(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Nothing to persist to — the theme still applies for this page view.
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="theme-preference">Appearance</Label>
      <Select value={preference} onValueChange={handleChange}>
        <SelectTrigger id="theme-preference" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">Match system</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Applies immediately, only on this device.</p>
    </div>
  );
}
