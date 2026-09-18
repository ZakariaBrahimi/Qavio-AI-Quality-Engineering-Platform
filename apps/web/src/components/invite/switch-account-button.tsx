'use client';

import { Button, toast } from '@qavio/ui';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { signOut } from '@/app/(auth)/actions';

export function SwitchAccountButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await signOut();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleClick} disabled={isPending}>
      Sign in with a different account
    </Button>
  );
}
