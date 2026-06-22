import type { ReactNode } from 'react';
import { useTranslation } from '@/intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface DetailHeaderBarProps {
  title: string;
  statusLabel?: string;
  /** Right-aligned summary, e.g. "12 lines · 3 edited". */
  summary?: string;
  onSave?: () => void;
  saveDisabled?: boolean;
  saving?: boolean;
  /** Extra controls rendered before the Save button (on-hold, add item…). */
  actions?: ReactNode;
}

/**
 * Top band of every document editor: title (with #number), a status chip, a
 * spacer, optional actions, a summary, and the primary Save button. Mirrors the
 * stocktake grid header so all editors share one look.
 */
export function DetailHeaderBar({
  title,
  statusLabel,
  summary,
  onSave,
  saveDisabled,
  saving,
  actions,
}: DetailHeaderBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {statusLabel ? <Badge variant="secondary">{statusLabel}</Badge> : null}
      <div className="grow" />
      {actions}
      {summary ? (
        <span className="text-sm text-muted-foreground">{summary}</span>
      ) : null}
      {onSave ? (
        <Button disabled={saveDisabled || saving} onClick={onSave}>
          {saving ? <Spinner className="size-4 text-current" /> : null}
          {saving ? t('button.saving') : t('button.save')}
        </Button>
      ) : null}
    </div>
  );
}
