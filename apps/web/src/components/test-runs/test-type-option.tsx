import { cn } from '@qavio/ui';
import { type LucideIcon } from 'lucide-react';

export interface TestTypeOptionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  recommended?: boolean;
  /** No worker executes this type yet (see @qavio/types' TestRunType doc comment) — shown but not selectable, rather than silently accepting a selection nothing will honor. */
  disabled?: boolean;
  onSelect: () => void;
}

/** Selectable card used in the "What do you want to test?" step of New Test Run. */
export function TestTypeOption({
  icon: Icon,
  title,
  description,
  selected,
  recommended,
  disabled,
  onSelect,
}: TestTypeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors',
        disabled
          ? 'cursor-not-allowed border-border opacity-50'
          : selected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:bg-accent',
      )}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-primary" />
        <span
          className={cn(
            'h-4 w-4 rounded-full border-2',
            selected ? 'border-primary bg-primary' : 'border-input',
          )}
        />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {disabled ? (
        <span className="inline-flex w-fit items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Coming soon
        </span>
      ) : recommended ? (
        <span className="inline-flex w-fit items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Recommended
        </span>
      ) : null}
    </button>
  );
}
