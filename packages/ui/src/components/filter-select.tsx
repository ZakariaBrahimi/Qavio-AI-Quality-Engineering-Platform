import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSelectProps {
  /** Placeholder shown when nothing is selected, e.g. "All Roles". */
  placeholder: string;
  options: FilterOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/**
 * The "All Roles" / "All Statuses" style filter dropdown used above data
 * tables throughout Qavio. A thin, opinionated wrapper over Select so
 * every filter row looks and behaves the same way.
 */
export function FilterSelect({
  placeholder,
  options,
  value,
  onValueChange,
  className,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
