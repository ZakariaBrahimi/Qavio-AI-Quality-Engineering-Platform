'use client';

import { Button, toast } from '@qavio/ui';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { acceptInvitation } from '@/app/invite/[token]/actions';

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInvitation(token);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push('/overview');
      router.refresh();
    });
  }

  return (
    <Button className="w-full" onClick={handleAccept} disabled={isPending}>
      {isPending ? 'Joining…' : 'Accept invitation'}
    </Button>
  );
}
