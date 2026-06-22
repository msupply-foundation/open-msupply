import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Replaces MUI CircularProgress. */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2Icon
      role="status"
      aria-label="loading"
      className={cn('size-5 animate-spin text-muted-foreground', className)}
    />
  );
}
