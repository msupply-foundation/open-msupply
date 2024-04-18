import { Box } from '@mui/material';
import React from 'react';
import { ColumnAlign, ColumnDefinition } from '../types';
import { useExpanded, useTableStore } from '../../context';
import { IconButton } from '@common/components';
import { RecordWithId } from '@common/types';
import { ChevronDownIcon, ChevronsDownIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

type RowExpandLabels = {
  header: string;
  cell: string;
};

export const getRowExpandColumn = <
  T extends RecordWithId & { canExpand?: boolean; lines?: T[] },
>(
  labels?: RowExpandLabels
): ColumnDefinition<T> => ({
  key: 'expand',
  sortable: false,
  align: ColumnAlign.Right,
  width: 60,
  Header: () => {
    const t = useTranslation();
    const { isGrouped, numberExpanded, toggleAllExpanded } = useTableStore();

    return isGrouped ? (
      <IconButton
        label={
          labels?.header ?? !!numberExpanded
            ? t('label.collapse-all')
            : t('label.expand-all')
        }
        onClick={toggleAllExpanded}
        icon={
          <Box
            sx={{
              transition: theme =>
                theme.transitions.create('transform', {
                  duration: theme.transitions.duration.leavingScreen,
                }),
              transform: !!numberExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronsDownIcon />
          </Box>
        }
      />
    ) : null;
  },
  Cell: ({ rowData }) => {
    const t = useTranslation();
    const { toggleExpanded, isExpanded } = useExpanded(rowData.id);

    if (!rowData.canExpand && !((rowData?.lines?.length ?? 0) > 1)) return null;

    return (
      <IconButton
        label={
          labels?.cell ?? isExpanded ? t('label.collapse') : t('label.expand')
        }
        onClick={event => {
          event.stopPropagation();
          toggleExpanded();
        }}
        icon={
          <Box
            sx={{
              transition: theme =>
                theme.transitions.create('transform', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <ChevronDownIcon />
          </Box>
        }
      />
    );
  },
});
