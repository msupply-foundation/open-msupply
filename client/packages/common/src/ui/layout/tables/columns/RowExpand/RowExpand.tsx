import { Box } from '@mui/material';
import React, { useCallback } from 'react';
import { ColumnAlign, ColumnDefinition } from '..';
import { TableStore, useTableStore } from '../..';
import { IconButton } from '../../../..';

import {
  ChevronDownIcon,
  ChevronsDownIcon,
  DomainObject,
} from '../../../../..';

const useExpanded = (rowId: string) => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        isExpanded: state.rowState[rowId]?.isExpanded,
        toggleExpanded: () => state.toggleExpanded(rowId),
        expanded: state.numberExpanded > 0,
      };
    },
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) =>
    oldState?.isExpanded === newState?.isExpanded &&
    oldState.rowId === newState.rowId;

  const { isExpanded, toggleExpanded, expanded } = useTableStore(
    selector,
    equalityFn
  );

  return { isExpanded, toggleExpanded, expanded };
};

export const getRowExpandColumn = <
  T extends DomainObject
>(): ColumnDefinition<T> => ({
  key: 'expand',
  sortable: false,
  align: ColumnAlign.Center,
  width: 60,
  Header: () => {
    const { numberExpanded, toggleAllExpanded } = useTableStore();
    return (
      <IconButton
        labelKey="app.admin"
        onClick={toggleAllExpanded}
        icon={
          <Box
            sx={{
              transition: theme =>
                theme.transitions.create('transform', {
                  duration: theme.transitions.duration.leavingScreen,
                }),
              transform: !!numberExpanded ? 'rotate(180deg)' : 'rotate(360deg)',
            }}
          >
            <ChevronsDownIcon />
          </Box>
        }
      />
    );
  },
  Cell: ({ rowData }) => {
    const { toggleExpanded, expanded } = useExpanded(rowData.id);

    return (
      <IconButton
        labelKey="app.admin"
        onClick={event => {
          event.stopPropagation();
          toggleExpanded();
        }}
        icon={
          <Box
            // sx={{
            //   animation: !!expanded
            //     ? `${spin} 1s ease`
            //     : `${otherSpin} 1s ease`,
            // }}
            sx={{
              transition: theme =>
                theme.transitions.create('transform', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              transform: expanded ? 'rotate(180deg)' : 'rotate(360deg)',
            }}
          >
            <ChevronDownIcon />
          </Box>
        }
      />
    );
  },
});
