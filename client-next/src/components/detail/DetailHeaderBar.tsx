import type { ReactNode } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useTranslation } from '@/intl';

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
    <Box
      sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
    >
      <Typography variant="h5">{title}</Typography>
      {statusLabel ? <Chip label={statusLabel} size="small" /> : null}
      <Box sx={{ flexGrow: 1 }} />
      {actions}
      {summary ? (
        <Typography variant="body2" color="text.secondary">
          {summary}
        </Typography>
      ) : null}
      {onSave ? (
        <Button
          variant="contained"
          disabled={saveDisabled || saving}
          onClick={onSave}
        >
          {saving ? t('button.saving') : t('button.save')}
        </Button>
      ) : null}
    </Box>
  );
}
