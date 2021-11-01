import { Box } from '@mui/material';
import React from 'react';
import { ColumnAlign, ColumnDefinition } from '..';
import { useExpanded } from '../..';
import { IconButton } from '../../../..';
import {
  ChevronDownIcon,
  ChevronsDownIcon,
  DomainObject,
  useTableStore,
} from '../../../../..';

export const getRowExpandColumn = <
  T extends DomainObject
>(): ColumnDefinition<T> => ({
  key: 'expand',
  sortable: false,
  align: ColumnAlign.Right,
  width: 60,
  Header: () => {
    const { numberExpanded, toggleAllExpanded } = useTableStore();

    return (
      <IconButton
        labelKey="label.expand-all"
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
        labelKey="label.expand"
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
