import { cn } from '@qavio/ui';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export interface AIInsightCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

/**
 * Gradient-tinted AI callout used in Test Run Details / Reports. Deliberately
 * takes a description string rather than rendering canned "AI found N
 * issues" copy — callers must pass the real state (pending, ready, or
 * unavailable) since there is no AI analysis backend yet.
 */
export function AIInsightCard({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: AIInsightCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
