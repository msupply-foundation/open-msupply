import { ArrowRightIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/intl';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatusBarProps<S extends string> {
  /** Ordered status sequence to display as crumbs. */
  sequence: readonly S[];
  current: S;
  /** Datetime each reached status happened (for the crumb tooltip). */
  reachedAt?: Partial<Record<S, string | null>>;
  label: (s: S) => string;
  /** Valid forward target statuses; first is the default. Empty hides the button. */
  nextOptions: readonly S[];
  onAdvance: (s: S) => void;
  advancing?: boolean;
  disabled?: boolean;
}

/**
 * Footer band: the status crumbs (reached statuses highlighted, with a date
 * tooltip) plus a "Save & confirm status" split button offering each valid
 * next status. Adapts the legacy StatusCrumbs + StatusChangeButton.
 */
export function StatusBar<S extends string>({
  sequence,
  current,
  reachedAt,
  label,
  nextOptions,
  onAdvance,
  advancing,
  disabled,
}: StatusBarProps<S>) {
  const { t } = useTranslation();
  const currentIndex = sequence.indexOf(current);
  const primary = nextOptions[0];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border bg-card px-4 py-2">
      <div className="flex flex-wrap items-center gap-1">
        {sequence.map((s, i) => {
          const reached = i <= currentIndex;
          const when = reachedAt?.[s];
          return (
            <div key={s} className="flex items-center gap-1">
              {i > 0 ? <span className="text-muted-foreground">›</span> : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'text-sm',
                      s === current ? 'font-bold' : 'font-medium',
                      reached ? 'text-foreground' : 'text-muted-foreground/60',
                    )}
                  >
                    {label(s)}
                  </span>
                </TooltipTrigger>
                {reached && when ? (
                  <TooltipContent>{formatDate(when)}</TooltipContent>
                ) : null}
              </Tooltip>
            </div>
          );
        })}
      </div>

      <div className="grow" />

      {!disabled && primary ? (
        <div className="flex items-center">
          <Button
            disabled={advancing}
            onClick={() => onAdvance(primary)}
            className={cn(nextOptions.length > 1 && 'rounded-e-none')}
          >
            {t('button.save-confirm-status', { status: label(primary) })}
            <ArrowRightIcon />
          </Button>
          {nextOptions.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={advancing}
                  size="icon"
                  aria-label={t('button.save')}
                  className="rounded-s-none border-s border-s-primary-foreground/20"
                >
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextOptions.map(s => (
                  <DropdownMenuItem key={s} onSelect={() => onAdvance(s)}>
                    {t('button.save-confirm-status', { status: label(s) })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
