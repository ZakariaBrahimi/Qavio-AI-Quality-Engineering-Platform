'use client';

import { Button, toast } from '@qavio/ui';
import { Plus } from 'lucide-react';

export function NewProjectButton() {
  return (
    <Button
      onClick={() =>
        toast.info('Creating projects ships with the Web Functional QA MVP — not connected yet.')
      }
    >
      <Plus className="h-4 w-4" />
      New Project
    </Button>
  );
}
