import type { Environment } from '@qavio/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qavio/ui';

export interface EnvironmentSelectorProps {
  environments: Environment[];
  value?: string;
  onValueChange?: (environmentId: string) => void;
  disabled?: boolean;
  id?: string;
}

export function EnvironmentSelector({
  environments,
  value,
  onValueChange,
  disabled,
  id,
}: EnvironmentSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || environments.length === 0}
    >
      <SelectTrigger id={id}>
        <SelectValue
          placeholder={environments.length === 0 ? 'No environments yet' : 'Select an environment'}
        />
      </SelectTrigger>
      <SelectContent>
        {environments.map((environment) => (
          <SelectItem key={environment.id} value={environment.id}>
            {environment.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
