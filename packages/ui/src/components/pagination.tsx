import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../lib/cn';
import { Button, type ButtonProps } from './button';

export function Pagination({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('flex items-center justify-between', className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: React.ComponentPropsWithoutRef<'ul'>) {
  return <ul className={cn('flex items-center gap-1', className)} {...props} />;
}

export function PaginationItem({ className, ...props }: React.ComponentPropsWithoutRef<'li'>) {
  return <li className={cn(className)} {...props} />;
}

export interface PaginationLinkProps extends ButtonProps {
  isActive?: boolean;
}

export function PaginationLink({ isActive, className, ...props }: PaginationLinkProps) {
  return (
    <Button
      aria-current={isActive ? 'page' : undefined}
      variant={isActive ? 'default' : 'outline'}
      size="icon"
      className={cn('h-8 w-8', className)}
      {...props}
    />
  );
}

export function PaginationPrevious({ className, ...props }: ButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Go to previous page"
      className={cn('gap-1', className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      Previous
    </Button>
  );
}

export function PaginationNext({ className, ...props }: ButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Go to next page"
      className={cn('gap-1', className)}
      {...props}
    >
      Next
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}
