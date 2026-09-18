import type { Project } from '@qavio/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qavio/ui';

export interface ProjectSelectorProps {
  projects: Project[];
  value?: string;
  onValueChange?: (projectId: string) => void;
  disabled?: boolean;
}

export function ProjectSelector({ projects, value, onValueChange, disabled }: ProjectSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || projects.length === 0}>
      <SelectTrigger>
        <SelectValue placeholder={projects.length === 0 ? 'No projects yet' : 'Select a project'} />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
