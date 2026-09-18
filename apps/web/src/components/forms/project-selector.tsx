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
  id?: string;
}

export function ProjectSelector({ projects, value, onValueChange, disabled, id }: ProjectSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || projects.length === 0}>
      <SelectTrigger id={id}>
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
