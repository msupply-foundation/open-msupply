import React from 'react';
import { Box, Button, Typography } from '@openmsupply-client/common';
import { DoseEntry } from '../../types';
import { useCellValue } from '../tallyDraftStore';

interface Props {
  dose: DoseEntry;
  counterId: string;
  isSelected: boolean;
  onToggle: (doseId: string) => void;
  readOnly?: boolean;
}

// Toggle button for one vaccine dose within a single patient encounter.
// isSelected = given to the current patient; pressing again deselects.
// The dim badge shows the running total from the store (across all patients).
// Subscribes only to its own cell so toggling one button never re-renders others.
export const VaccineButton = React.memo(function VaccineButton({
  dose,
  counterId,
  isSelected,
  onToggle,
  readOnly = false,
}: Props) {
  const runningTotal = useCellValue(dose.id, counterId);

  return (
    <Button
      variant={isSelected ? 'contained' : 'outlined'}
      disabled={readOnly}
      onClick={() => onToggle(dose.id)}
      sx={{
        height: 88,
        flexDirection: 'column',
        gap: 0.5,
        borderRadius: 2,
        textTransform: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'all 0.15s',
        ...(isSelected
          ? {
              backgroundColor: 'warning.main',
              borderColor: 'warning.main',
              color: '#fff',
              boxShadow: '0 2px 10px rgba(234,88,12,0.25)',
              '&:hover': { backgroundColor: 'warning.dark' },
            }
          : {
              borderWidth: '1.5px',
            }),
      }}
    >
      {/* Checkmark when selected */}
      {isSelected && (
        <Typography variant="body2" sx={{ fontSize: 18, lineHeight: 1, color: '#fff' }}>
          ✓
        </Typography>
      )}

      <Typography
        variant="subtitle2"
        fontWeight="bold"
        sx={{ lineHeight: 1.2, textAlign: 'center' }}
      >
        {dose.display_name}
      </Typography>

      {/* Running total badge — dim reminder of cumulative count */}
      {runningTotal > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 5,
            right: 8,
            fontSize: 10,
            color: isSelected ? 'rgba(255,255,255,0.6)' : 'text.disabled',
            lineHeight: 1,
          }}
        >
          ×{runningTotal}
        </Box>
      )}
    </Button>
  );
});
