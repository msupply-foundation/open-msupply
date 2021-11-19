import { Box } from '@mui/material';
import React from 'react';
import { ColumnAlign, ColumnDefinition } from '../types';
import { useExpanded, useTableStore } from '../../context';
import { IconButton } from '../../../../components/buttons';
import { DomainObject } from '../../../../../types';
import { ChevronDownIcon, ChevronsDownIcon } from '../../../../icons';

type RowExpandLabels = {
  header: string;
  cell: string;
};

export const getRowExpandColumn = <T extends DomainObject>(
  labels: RowExpandLabels
): ColumnDefinition<T> => ({
  key: 'expand',
  sortable: false,
  align: ColumnAlign.Right,
  width: 60,
  Header: () => {
    const { numberExpanded, toggleAllExpanded } = useTableStore();

    return (
      <IconButton
        label={labels.header}
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
    );
  },
  Cell: ({ rowData }) => {
    const { toggleExpanded, isExpanded } = useExpanded(rowData.id);

    return (
      <IconButton
        label={labels.cell}
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
