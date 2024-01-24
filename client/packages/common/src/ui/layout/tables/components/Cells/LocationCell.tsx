import React from 'react';
import {
  CellProps,
  RecordWithId,
  Tooltip,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

export const LocationCell = <
  T extends { onHold: boolean },
  K extends RecordWithId & { location?: T | null },
>({
  column,
  rowData,
}: CellProps<K>): React.ReactElement<CellProps<K>> => {
  const t = useTranslation();
  const onHoldText = rowData?.location?.onHold
    ? ` (${t('label.on-hold')})`
    : '';
  const text = `${column.accessor({ rowData }) ?? ''}${onHoldText}`;

  return (
    <Tooltip title={text} placement="bottom-start">
      <Typography
        component="div"
        sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: !!rowData.location?.onHold ? 'error.main' : 'inherit',
        }}
      >
        {text}
      </Typography>
    </Tooltip>
  );
};
