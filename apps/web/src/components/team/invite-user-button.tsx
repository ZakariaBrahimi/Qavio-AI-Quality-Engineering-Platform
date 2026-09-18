'use client';

import { Button, toast } from '@qavio/ui';
import { UserPlus } from 'lucide-react';

export function InviteUserButton() {
  return (
    <Button
      onClick={() =>
        toast.info('Inviting teammates ships alongside authentication — not connected yet.')
      }
    >
      <UserPlus className="h-4 w-4" />
      Invite User
    </Button>
  );
}
