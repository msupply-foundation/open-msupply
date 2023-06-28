import React from 'react';
import { Box } from '@mui/material';
import { Typography } from '@common/components';
import {
  ColumnDefinition,
  ColumnDescription,
  EncounterNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import { useLogicalStatus } from '../utils';
import {
  EncounterRowFragment,
  ProgramEnrolmentRowFragmentWithId,
} from 'packages/programs/src';

export const eventCellValue = (
  rowData: EncounterRowFragment | ProgramEnrolmentRowFragmentWithId,
  singleEncounter: boolean
) => {
  const t = useTranslation();
  let additionalInfo = [];

  if (!!rowData?.events[0]) {
    additionalInfo.push(rowData.events[0].data ?? '');
  }

  if (singleEncounter && rowData?.status === EncounterNodeStatus.Pending) {
    const startDatetime = new Date(rowData?.startDatetime);
    additionalInfo.push(useLogicalStatus(startDatetime, t));
  }

  return additionalInfo;
};

export const getAdditionalInformationColumn = <
  T extends EncounterRowFragment | ProgramEnrolmentRowFragmentWithId
>(
  singleEncounter: boolean
): ColumnDefinition<T> | ColumnDescription<T> => ({
  label: 'label.additional-info',
  key: 'events',
  sortable: false,
  Cell: ({ rowData }) => {
    const additionalInfo = eventCellValue(rowData, singleEncounter);

    if (!additionalInfo[0]) return null;

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
