import React, { useCallback } from 'react';
import {
  Box,
  MinusIcon,
  NumericTextInput,
  PlusIcon,
  Stack,
  Typography,
} from '@openmsupply-client/common';
import MuiIconButton from '@mui/material/IconButton';
import { usePluginTranslation } from '../../../locales';
import { useCellValue, useTallyDraftActions } from '../tallyDraftStore';

interface Props {
  label: string;
  doseId: string;
  counterId: string;
  readOnly?: boolean;
}

// One counter row: label + integrated stepper [- N +]. The +/- buttons and
// the numeric input sit in a single bordered container so they read as one
// control.
//
// We use MUI's IconButton directly because the project's wrapper IconButton
// in `@openmsupply-client/common` adds a Tooltip and takes `icon` as a prop
// rather than children — both unwanted here.
//
// Subscribes to its OWN cell in the tally store via `useCellValue`, so a +/-
// tap re-renders only this control — every other cell's selector returns the
// same number and bails out, independent of how many groups are on screen. The
// `React.memo` keeps a parent re-render from cascading; the store subscription
// drives value-change re-renders.
export const CounterControl = React.memo(function CounterControl({
  label,
  doseId,
  counterId,
  readOnly = false,
}: Props) {
  const t = usePluginTranslation();
  const value = useCellValue(doseId, counterId);
  const { setCount } = useTallyDraftActions();
  const setValue = useCallback(
    (next: number | undefined) =>
      setCount(doseId, counterId, Math.max(0, next ?? 0)),
    [setCount, doseId, counterId]
  );

  return (
    <Stack
      direction="row"
      alignItems="center"
      // flex-end glues the label to its own stepper and right-aligns the pair so
      // the steppers line up in columns. It resolves against the flex main-axis,
      // so it auto-flips to the start side under the host's RTL theme — no
      // physical left/right used.
      justifyContent="flex-end"
      gap={1}
      flex={1}
      sx={{ minWidth: 0 }}
    >
      {/* The label is what gives way when space is tight — it shrinks/wraps
          while the stepper keeps its full width (see flexShrink below). */}
      <Typography variant="body2" sx={{ minWidth: 0 }}>
        {t(label, { defaultValue: label })}
      </Typography>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          // Never let the stepper compress: it has overflow:hidden, so
          // shrinking it would clip the +/- buttons on narrow screens.
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          opacity: readOnly ? 0.6 : 1,
        }}
      >
        <MuiIconButton
          aria-label={t('detail.counter.decrease', { label })}
          size="large"
          onClick={() => setValue(value - 1)}
          disabled={readOnly || value <= 0}
          sx={{ borderRadius: 0 }}
        >
          <MinusIcon fontSize="large" />
        </MuiIconButton>
        <Box
          sx={{
            borderLeft: '1px solid',
            borderRight: '1px solid',
            borderColor: 'divider',
            // The shared input only paints the grey fill on the field itself,
            // leaving transparent gaps (its rounded corners and the reserved
            // required-asterisk slot) through which the container's white
            // shows.
            // Paint the column the same grey so the fill reaches the borders.
            backgroundColor: readOnly
              ? 'background.input.disabled'
              : 'background.input.main',
          }}
        >
          <NumericTextInput
            width={56}
            value={value}
            min={0}
            onChange={setValue}
            disabled={readOnly}
          />
        </Box>
        <MuiIconButton
          aria-label={t('detail.counter.increase', { label })}
          size="large"
          onClick={() => setValue(value + 1)}
          disabled={readOnly}
          sx={{ borderRadius: 0 }}
        >
          <PlusIcon fontSize="large" />
        </MuiIconButton>
      </Box>
    </Stack>
  );
});
