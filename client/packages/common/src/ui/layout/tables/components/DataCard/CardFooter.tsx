import React, { MouseEvent, ReactElement } from 'react';
import { Box } from '@mui/material';
import { ChevronDownIcon } from '@common/icons';

interface CardFooterProps {
  hasMoreColumns: boolean;
  showAllColumns: boolean;
  handleExpandClick: (e: MouseEvent) => void;
}

export const CardFooter = ({
  hasMoreColumns,
  showAllColumns,
  handleExpandClick,
}: CardFooterProps): ReactElement => {
  return (
    <>
      {hasMoreColumns && (
        <Box
          sx={{
            py: 0.2,
            mt: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            borderTop: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Box
            onClick={handleExpandClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              cursor: 'pointer',
              borderRadius: 1,
            }}
          >
            {showAllColumns ? 'Show Less' : 'Show More'}
            <ChevronDownIcon
              fontSize="small"
              sx={{
                ml: 0.5,
                transform: showAllColumns ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </Box>
        </Box>
      )}
    </>
  );
};
