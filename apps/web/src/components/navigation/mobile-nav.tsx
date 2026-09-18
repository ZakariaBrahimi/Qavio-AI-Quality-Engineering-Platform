'use client';

import { Dialog, DialogContent, DialogTitle } from '@qavio/ui';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { AppSidebar } from './app-sidebar';

/** Hamburger button + slide-in drawer, shown below the `md` breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <DialogContent className="left-0 top-0 h-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none p-0 sm:max-w-xs">
        <DialogTitle className="sr-only">Navigation</DialogTitle>
        <AppSidebar className="w-full" onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
