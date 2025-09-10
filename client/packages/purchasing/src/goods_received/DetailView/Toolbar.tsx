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
  Formatter,
} from '@openmsupply-client/common';
import { useGoodsReceived } from '../api/hooks';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const {
    query: { data },
    update: { update },
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
                    update({ supplierReference: e.target.value });
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
                  update({ receivedDatetime: Formatter.naiveDate(date) })
                }
                disabled={isDisabled}
              />
            }
          />
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
