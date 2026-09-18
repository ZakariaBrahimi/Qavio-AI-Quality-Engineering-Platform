import type { Project } from '@qavio/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@qavio/ui';
import { Globe, Smartphone, Terminal } from 'lucide-react';
import Link from 'next/link';

const PLATFORM_ICON = {
  web: Globe,
  mobile: Smartphone,
  api: Terminal,
} as const;

export interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const Icon = PLATFORM_ICON[project.platform];

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-base">{project.name}</CardTitle>
              {project.archivedAt ? (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Archived
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">{project.slug}</p>
          </div>
        </CardHeader>
        <CardContent>
          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          ) : (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {project.platform} application
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
