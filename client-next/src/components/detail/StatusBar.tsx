import { useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useTranslation } from '@/intl';
import { formatDate } from '@/lib/format';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const currentIndex = sequence.indexOf(current);
  const primary = nextOptions[0];

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {sequence.map((s, i) => {
          const reached = i <= currentIndex;
          const when = reachedAt?.[s];
          return (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {i > 0 ? (
                <Typography component="span" color="text.disabled">
                  ›
                </Typography>
              ) : null}
              <Tooltip title={reached && when ? formatDate(when) : ''}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: s === current ? 700 : 500,
                    color: reached ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {label(s)}
                </Typography>
              </Tooltip>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {!disabled && primary ? (
        <>
          <ButtonGroup ref={anchorRef} variant="contained" disabled={advancing}>
            <Button endIcon={<ArrowRightIcon />} onClick={() => onAdvance(primary)}>
              {t('button.save-confirm-status', { status: label(primary) })}
            </Button>
            {nextOptions.length > 1 ? (
              <Button size="small" onClick={() => setMenuOpen(o => !o)}>
                <ArrowDropDownIcon />
              </Button>
            ) : null}
          </ButtonGroup>
          <Menu
            open={menuOpen}
            anchorEl={anchorRef.current}
            onClose={() => setMenuOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            {nextOptions.map(s => (
              <MenuItem
                key={s}
                onClick={() => {
                  setMenuOpen(false);
                  onAdvance(s);
                }}
              >
                {t('button.save-confirm-status', { status: label(s) })}
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}
    </Paper>
  );
}
