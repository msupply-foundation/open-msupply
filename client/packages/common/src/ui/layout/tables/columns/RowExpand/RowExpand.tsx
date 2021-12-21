import { Box } from '@mui/material';
import React from 'react';
import { ColumnAlign, ColumnDefinition } from '../types';
import { useExpanded, useTableStore } from '../../context';
import { IconButton } from '@common/components';
import { DomainObject } from '@common/types';
import { ChevronDownIcon, ChevronsDownIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

type RowExpandLabels = {
  header: string;
  cell: string;
};

export const getRowExpandColumn = <
  T extends DomainObject & { canExpand?: boolean }
>(
  labels?: RowExpandLabels
): ColumnDefinition<T> => ({
  key: 'expand',
  sortable: false,
  align: ColumnAlign.Right,
  width: 60,
  Header: () => {
    const t = useTranslation('common');
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
    if (!rowData.canExpand) return null;

    const t = useTranslation('common');
    const { toggleExpanded, isExpanded } = useExpanded(rowData.id);

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
