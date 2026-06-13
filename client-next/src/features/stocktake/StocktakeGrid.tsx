import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { z } from 'zod';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { stocktakeSdk } from './api';
import { stocktakeKeys } from './queries';
import type {
  StocktakeLineRowFragment,
  StocktakeRowFragment,
} from './stocktake.generated';

interface Props {
  storeId: string;
  stocktakeId: string;
  header: StocktakeRowFragment | null | undefined;
  lines: StocktakeLineRowFragment[];
}

interface FormValues {
  counted: Record<string, string>;
}

const COLS = '110px minmax(220px, 1fr) 130px 110px 80px 110px 140px';
const ROW_HEIGHT = 44;
const CARD_HEIGHT = 132;

const cell = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

// Per-line validation. Source of truth is a Zod schema; we apply it per field via
// RHF's `validate` (so only the edited row re-validates, not all ~5,000 at once).
const countedValueSchema = z
  .number({ message: 'Enter a number' })
  .nonnegative('Must be 0 or more');

function validateCounted(raw: string): true | string {
  if (raw === '') return true; // empty = "not counted yet", allowed
  const n = Number(raw);
  const result = countedValueSchema.safeParse(Number.isNaN(n) ? raw : n);
  return result.success || (result.error.issues[0]?.message ?? 'Invalid');
}

export function StocktakeGrid({ storeId, stocktakeId, header, lines }: Props) {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const defaultValues = useMemo<FormValues>(
    () => ({
      counted: Object.fromEntries(
        lines.map(l => [l.id, l.countedNumberOfPacks?.toString() ?? '']),
      ),
    }),
    [lines],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty, errors },
  } = useForm<FormValues>({ defaultValues, mode: 'onChange' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowHeight = isPhone ? CARD_HEIGHT : ROW_HEIGHT;
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  // Layout swap (grid <-> cards) changes row height; re-measure so offsets stay correct.
  useEffect(() => virtualizer.measure(), [isPhone, virtualizer]);

  // Keyboard nav: move focus between counted inputs, scrolling the target into view
  // first (it may be virtualized out of the DOM until then).
  const focusRow = useCallback(
    (index: number) => {
      if (index < 0 || index >= lines.length) return;
      virtualizer.scrollToIndex(index, { align: 'auto' });
      requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector<HTMLInputElement>(
          `input[data-index="${index}"]`,
        );
        el?.focus();
        el?.select();
      });
    },
    [lines.length, virtualizer],
  );

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusRow(index + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusRow(index - 1);
      }
    },
    [focusRow],
  );

  const save = useMutation({
    mutationFn: (updates: { id: string; countedNumberOfPacks: number }[]) =>
      stocktakeSdk.upsertStocktakeLines({
        storeId,
        updateStocktakeLines: updates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: stocktakeKeys.lines(storeId, stocktakeId),
      });
    },
  });

  const onSave = handleSubmit(async values => {
    const changedIds = Object.keys(dirtyFields.counted ?? {});
    const updates = changedIds
      .filter(id => values.counted[id] !== '' && values.counted[id] != null)
      .map(id => ({ id, countedNumberOfPacks: Number(values.counted[id]) }));
    if (!updates.length) return;
    await save.mutateAsync(updates);
    reset(values); // new clean baseline (clears dirty without a full refetch round-trip)
  });

  const dirtyCount = Object.keys(dirtyFields.counted ?? {}).length;
  const errorCount = Object.keys(errors.counted ?? {}).length;

  // Shared editable input — same control/validation/keyboard behaviour in both layouts.
  const countedInput = (
    line: StocktakeLineRowFragment,
    index: number,
    invalid: boolean,
  ) => (
    <input
      type="number"
      min={0}
      inputMode="decimal"
      data-index={index}
      aria-invalid={invalid}
      {...register(`counted.${line.id}`, { validate: validateCounted })}
      onKeyDown={e => onInputKeyDown(e, index)}
      title={invalid ? errors.counted?.[line.id]?.message : undefined}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '4px 8px',
        border: `1px solid ${invalid ? theme.palette.error.main : '#c4c4c4'}`,
        borderRadius: 4,
        font: 'inherit',
      }}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography variant="h5">
          Stocktake #{header?.stocktakeNumber ?? ''}
        </Typography>
        {header?.status ? <Chip label={header.status} size="small" /> : null}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {lines.length.toLocaleString()} lines
          {dirtyCount ? ` · ${dirtyCount} edited` : ''}
          {errorCount ? ` · ${errorCount} invalid` : ''}
        </Typography>
        <Button
          variant="contained"
          disabled={!isDirty || errorCount > 0 || save.isPending}
          onClick={onSave}
        >
          {save.isPending ? 'Saving…' : 'Save counts'}
        </Button>
      </Box>

      <Paper
        variant="outlined"
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        {!isPhone && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: COLS,
              gap: 1,
              px: 2,
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'grey.100',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <span>Code</span>
            <span>Item</span>
            <span>Batch</span>
            <span>Expiry</span>
            <span style={{ textAlign: 'right' }}>Pack</span>
            <span style={{ textAlign: 'right' }}>Snapshot</span>
            <span>Counted</span>
          </Box>
        )}

        <Box ref={scrollRef} sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Box
            sx={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map(vi => {
              const line = lines[vi.index];
              const invalid = Boolean(errors.counted?.[line.id]);
              const rowSx = {
                position: 'absolute' as const,
                top: 0,
                left: 0,
                width: '100%',
                height: vi.size,
                transform: `translateY(${vi.start}px)`,
              };

              if (isPhone) {
                return (
                  <Box
                    key={line.id}
                    sx={{
                      ...rowSx,
                      px: 2,
                      py: 1.5,
                      borderBottom: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Stack spacing={0.5} sx={{ height: '100%' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ ...cell, flex: 1 }}
                        >
                          {line.item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {line.item.code}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={cell}>
                        {[
                          line.batch ? `Batch ${line.batch}` : null,
                          line.expiryDate
                            ? `Exp ${format(new Date(line.expiryDate), 'dd/MM/yyyy')}`
                            : null,
                          line.packSize != null ? `Pack ${line.packSize}` : null,
                          `Snapshot ${line.snapshotNumberOfPacks}`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 'auto',
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 64 }}>
                          Counted
                        </Typography>
                        <Box sx={{ flex: 1 }}>{countedInput(line, vi.index, invalid)}</Box>
                        {invalid && (
                          <Typography variant="caption" color="error.main">
                            {errors.counted?.[line.id]?.message}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                );
              }

              return (
                <Box
                  key={line.id}
                  sx={{
                    ...rowSx,
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    gap: 1,
                    alignItems: 'center',
                    px: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    fontSize: 13,
                  }}
                >
                  <span style={cell}>{line.item.code}</span>
                  <span style={cell}>{line.item.name}</span>
                  <span style={cell}>{line.batch ?? ''}</span>
                  <span style={cell}>
                    {line.expiryDate
                      ? format(new Date(line.expiryDate), 'dd/MM/yyyy')
                      : ''}
                  </span>
                  <span style={{ textAlign: 'right' }}>{line.packSize ?? ''}</span>
                  <span style={{ textAlign: 'right' }}>
                    {line.snapshotNumberOfPacks}
                  </span>
                  {countedInput(line, vi.index, invalid)}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
