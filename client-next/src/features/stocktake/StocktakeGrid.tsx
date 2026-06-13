import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
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

const cell = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export function StocktakeGrid({ storeId, stocktakeId, header, lines }: Props) {
  const queryClient = useQueryClient();

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
    formState: { dirtyFields, isDirty },
  } = useForm<FormValues>({ defaultValues });

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">Stocktake #{header?.stocktakeNumber ?? ''}</Typography>
        {header?.status ? <Chip label={header.status} size="small" /> : null}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {lines.length.toLocaleString()} lines
          {dirtyCount ? ` · ${dirtyCount} edited` : ''}
        </Typography>
        <Button
          variant="contained"
          disabled={!isDirty || save.isPending}
          onClick={onSave}
        >
          {save.isPending ? 'Saving…' : 'Save counts'}
        </Button>
      </Box>

      <Paper
        variant="outlined"
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
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
              return (
                <Box
                  key={line.id}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
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
                  <input
                    type="number"
                    min={0}
                    {...register(`counted.${line.id}`)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '4px 8px',
                      border: '1px solid #c4c4c4',
                      borderRadius: 4,
                      font: 'inherit',
                    }}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
