import React from 'react';
import { Box } from '@mui/material';
import { Typography } from '@common/components';
import {
  ColumnDataAccessor,
  ColumnDefinition,
  ColumnDescription,
  RecordWithId,
} from '@openmsupply-client/common';

export const getAdditionalInformationColumn = <T extends RecordWithId>(
  accessor: ColumnDataAccessor<T>
): ColumnDefinition<T> | ColumnDescription<T> => ({
  label: 'label.additional-info',
  key: 'events',
  sortable: false,
  Cell: ({ rowData }) => {
    const additionalInfo = accessor({ rowData }) as string[];

    if (additionalInfo.length === 0) return null;

    return (
      <Box
        sx={{
          flexDirection: 'row',
          borderBottom: 'none',
          alignItems: 'center',
          display: 'flex',
        }}
      >
        {additionalInfo.map((info, index) => (
          <Box
            sx={{
              padding: 0.5,
            }}
            key={index}
          >
            <Typography
              sx={{
                fontSize: 12,
                border: 1,
                borderRadius: 15,
                padding: 0.5,
                backgroundColor: 'background.drawer',
              }}
            >
              {info}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  },
  minWidth: 400,
});
