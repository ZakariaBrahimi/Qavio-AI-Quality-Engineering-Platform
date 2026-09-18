import { cn } from '../lib/cn';

export interface QavioLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `icon` — mark only. `compact` — smaller mark, for collapsed sidebars.
   * `full` (default) — mark + wordmark.
   */
  variant?: 'icon' | 'compact' | 'full';
  /** Wordmark color: `dark` for light backgrounds, `light` for dark backgrounds (e.g. the sidebar). */
  tone?: 'dark' | 'light';
}

const MARK_SIZE: Record<NonNullable<QavioLogoProps['variant']>, string> = {
  icon: 'h-8 w-8',
  compact: 'h-6 w-6',
  full: 'h-8 w-8',
};

/**
 * The single source of truth for the Qavio mark. Never inline the gradient
 * "Q" mark or the wordmark directly on a page — import this everywhere
 * (sidebar, auth screens, headers, emails) so the identity stays consistent.
 */
export function QavioLogo({ variant = 'full', tone = 'dark', className, ...props }: QavioLogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} {...props}>
      <svg
        viewBox="0 0 32 32"
        className={cn(MARK_SIZE[variant], 'shrink-0')}
        role="img"
        aria-label="Qavio"
      >
        <defs>
          <linearGradient id="qavio-mark-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(217 91% 60%)" />
            <stop offset="100%" stopColor="hsl(262 83% 58%)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#qavio-mark-gradient)" />
        <circle
          cx="16"
          cy="16"
          r="7.5"
          fill="none"
          stroke="white"
          strokeWidth="3.25"
          strokeLinecap="round"
        />
        <path d="M18 19 L23 24" stroke="white" strokeWidth="3.25" strokeLinecap="round" />
      </svg>
      {variant === 'full' ? (
        <span
          className={cn(
            'text-lg font-bold tracking-tight',
            tone === 'light' ? 'text-white' : 'text-foreground',
          )}
        >
          Qavio
        </span>
      ) : null}
    </div>
  );
}
