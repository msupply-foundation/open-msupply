import React from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  Tooltip,
  DateTimePickerInput,
  DateUtils,
} from '@openmsupply-client/common';
import { useGoodsReceived } from '../api/hooks';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const {
    query: { data },
  } = useGoodsReceived();

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginBottom: 1,
        flexDirection: 'column',
      }}
    >
      <Grid container gap={2} flexWrap="nowrap">
        <Grid display="flex" flexDirection="column" gap={1}>
          <InputWithLabelRow
            label={t('label.supplier-reference')}
            Input={
              <Tooltip title={data?.supplierReference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  sx={{ width: 225 }}
                  size="small"
                  value={data?.supplierReference ?? null}
                  onChange={e => {
                    console.info('Supplier reference changed:', e.target.value);
                  }}
                />
              </Tooltip>
            }
          />
          <InputWithLabelRow
            label={t('label.received-date')}
            labelWidth="170px"
            Input={
              <DateTimePickerInput
                value={DateUtils.getDateOrNull(data?.receivedDatetime)}
                onChange={date =>
                  console.info('Received delivery date changed:', date)
                }
              />
            }
          />
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
