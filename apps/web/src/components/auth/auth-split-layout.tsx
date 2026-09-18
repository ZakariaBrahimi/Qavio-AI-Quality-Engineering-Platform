import { QavioLogo } from '@qavio/ui';
import { CheckCircle2 } from 'lucide-react';

const FEATURES = ['Functional Testing', 'Visual Testing', 'Responsive Testing', 'Security Testing'];

export interface AuthSplitLayoutProps {
  headline: string;
  subheadline: string;
  children: React.ReactNode;
}

/**
 * Two-panel auth shell (marketing panel + form) used by Login and Sign Up.
 * `AuthCardLayout` is the single-panel variant for the other auth screens.
 */
export function AuthSplitLayout({ headline, subheadline, children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-qavio-gradient p-10 text-white lg:flex">
        <QavioLogo tone="light" />
        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight">{headline}</h1>
          <p className="max-w-sm text-white/80">{subheadline}</p>
          <ul className="space-y-2">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-white/90">
                <CheckCircle2 className="h-4 w-4" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">Qavio · AI Quality Engineering Platform</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mb-8 lg:hidden">
          <QavioLogo />
        </div>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
