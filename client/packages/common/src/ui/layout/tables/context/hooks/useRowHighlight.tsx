import React, { useContext } from 'react';
import { GlobalStyles } from '@mui/material';
import { tableContext } from '../..';

/**
 * Applies a temporary highlight animation to specified table rows
 */
export const useRowHighlight = () => {
  // using the hook useRowStyle from this hook will throw a zustand error `getSnapshot is not a function`
  const store = useContext(tableContext);

  const highlightRows = ({
    rowIds,
  }: {
    rowIds: string[];
    hasPlaceholder?: boolean;
  }) => {
    const { setRowStyle, rowState } = store.getState();
    const currentRowIds = Object.keys(rowState);
    // retain the style of existing rows, while unsetting their animation prop
    currentRowIds.forEach(id => {
      setRowStyle(id, { ...rowState[id]?.style, animation: 'unset' });
    });
    // set the animation prop for the new rows, retaining the other style props
    rowIds.forEach(id => {
      const existingStyle = rowState[id]?.style;
      setRowStyle(id, { ...existingStyle, animation: 'highlight 1.5s' });
    });
  };

  const HighlightStyles = () => (
    <GlobalStyles
      styles={{
        '@keyframes highlight': {
          from: { backgroundColor: 'rgba(199, 201, 217, 1)' },
          to: { backgroundColor: 'rgba(199, 201, 217, 0)' },
        },
      }}
    />
  );

  return { highlightRows, HighlightStyles };
};
