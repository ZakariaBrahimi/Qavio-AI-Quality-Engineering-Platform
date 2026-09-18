import { Calendar } from 'lucide-react';

import { cn } from '../lib/cn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

const PRESET_LABEL: Record<DateRangePreset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom range',
};

export interface DateRangePickerProps {
  value: DateRangePreset;
  onValueChange: (value: DateRangePreset) => void;
  className?: string;
}

/**
 * Preset-based date range control, matching the "Last 7 days" dropdown in
 * the Reports design. A full calendar range picker is not needed for any
 * screen shipped so far — add one only when a design actually calls for
 * picking arbitrary custom dates.
 */
export function DateRangePicker({ value, onValueChange, className }: DateRangePickerProps) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as DateRangePreset)}>
      <SelectTrigger className={cn('gap-2', className)}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Date range" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PRESET_LABEL).map(([preset, label]) => (
          <SelectItem key={preset} value={preset}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
