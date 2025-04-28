import React, { ReactElement } from 'react';
import {
  ReasonOptionsSearchInput,
  RequestLineFragment,
} from '@openmsupply-client/system';
import {
  Grid,
  InputWithLabelRow,
  NumUtils,
  Plugins,
  ReadOnlyInput,
  ReasonOptionNodeType,
  Stack,
  useAuthContext,
  useFormatNumber,
  useTranslation,
} from '@openmsupply-client/common';
import { useRequest } from '../../../api';
import { DraftRequestLine } from '../hooks';
import { RequestStats } from '../ItemCharts/RequestStats';

const LABEL_WIDTH = '400px';

interface DetailsProps {
  update: (patch: Partial<DraftRequestLine>) => void;
  plugins: Plugins;
  draft?: DraftRequestLine | null;
  save?: () => void;
  isProgram?: boolean;
  isPacksEnabled?: boolean;
  disabled?: boolean;
  line?: RequestLineFragment;
}

export const Details = ({
  draft,
  save,
  update,
  isProgram,
  isPacksEnabled,
  plugins,
  disabled,
  line,
}: DetailsProps): ReactElement => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const formatNumber = useFormatNumber();

  const { maxMonthsOfStock, minMonthsOfStock } = useRequest.document.fields([
    'maxMonthsOfStock',
    'minMonthsOfStock',
  ]);

  const targetStock =
    (draft?.itemStats.averageMonthlyConsumption ?? 0) * maxMonthsOfStock;

  const useConsumptionData =
    store?.preferences?.useConsumptionAndStockFromCustomersForInternalOrders;

  const NumericReadOnlyInput = ({ value }: { value?: number | null }) => {
    return (
      <ReadOnlyInput value={NumUtils.round(value ?? 0, 2).toString()} number />
    );
  };

  return (
    <>
      <Grid container spacing={10} direction="row">
        {/* Left Column Content */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={1.5}>
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={draft?.unitName ?? ''}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.unit')}
            />
            {isPacksEnabled ? (
              <InputWithLabelRow
                Input={
                  <ReadOnlyInput
                    value={t('format.quantity-with-units', {
                      count: draft?.defaultPackSize,
                    })}
                    style={{ textAlign: 'right' }}
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.default-pack-size')}
              />
            ) : null}
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={t('format.quantity-with-units', {
                    count: draft?.itemStats.availableStockOnHand,
                  })}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.our-soh')}
            />
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={t('format.quantity-with-units', {
                    count: draft?.itemStats.averageMonthlyConsumption,
                  })}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.amc')}
              sx={{ marginBottom: 1 }}
            />
            {isProgram && useConsumptionData && (
              <>
                <InputWithLabelRow
                  Input={
                    <ReadOnlyInput
                      value={t('format.quantity-with-units', {
                        count: draft?.incomingUnits,
                      })}
                      style={{ textAlign: 'right' }}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.incoming-stock')}
                />
                <InputWithLabelRow
                  Input={
                    <ReadOnlyInput
                      value={t('format.quantity-with-units', {
                        count: draft?.outgoingUnits,
                      })}
                      style={{ textAlign: 'right' }}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.outgoing')}
                />
                <InputWithLabelRow
                  Input={
                    <ReadOnlyInput
                      value={t('format.quantity-with-units', {
                        count: draft?.lossInUnits,
                      })}
                      style={{ textAlign: 'right' }}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.losses')}
                />
                <InputWithLabelRow
                  Input={
                    <ReadOnlyInput
                      value={t('format.quantity-with-units', {
                        count: draft?.additionInUnits,
                      })}
                      style={{ textAlign: 'right' }}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.additions')}
                />
              </>
            )}
          </Stack>
        </Grid>

        {/* Right Column Content */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={1.5}>
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={t('format.quantity-with-months', {
                    count: maxMonthsOfStock,
                  })}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.mos')}
            />
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={t('format.quantity-with-months', {
                    count: minMonthsOfStock ?? maxMonthsOfStock,
                  })}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.reorder-threshold')}
            />
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={`${formatNumber.round(targetStock)} ${t('label.units-plural', { count: targetStock })}`}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.target-stock')}
            />
            <InputWithLabelRow
              Input={
                <ReadOnlyInput
                  value={t('format.quantity-with-units', {
                    count: NumUtils.round(draft?.suggestedQuantity ?? 0),
                  })}
                  style={{ textAlign: 'right' }}
                />
              }
              labelWidth={LABEL_WIDTH}
              label={t('label.suggested-quantity')}
            />
            {isProgram && useConsumptionData && (
              <>
                <InputWithLabelRow
                  Input={
                    <NumericReadOnlyInput
                      value={draft?.itemStats.availableMonthsOfStockOnHand}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.months-of-stock')}
                />
                <InputWithLabelRow
                  Input={
                    <ReadOnlyInput
                      value={t('format.quantity-with-units', {
                        count: draft?.expiringUnits,
                      })}
                      style={{ textAlign: 'right' }}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.short-expiry')}
                />
                <InputWithLabelRow
                  Input={<NumericReadOnlyInput value={draft?.daysOutOfStock} />}
                  labelWidth={LABEL_WIDTH}
                  label={t('label.days-out-of-stock')}
                />
                <InputWithLabelRow
                  Input={
                    <ReasonOptionsSearchInput
                      value={draft?.reason}
                      onChange={value => {
                        update({ reason: value });
                      }}
                      width={150}
                      type={ReasonOptionNodeType.RequisitionLineVariance}
                      isDisabled={
                        draft?.requestedQuantity === draft?.suggestedQuantity ||
                        disabled
                      }
                      onBlur={save}
                    />
                  }
                  labelWidth={'66px'}
                  label={t('label.reason')}
                />
              </>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Plugins and Request Stats */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          {line &&
            plugins.requestRequisitionLine?.editViewField?.map(
              (Field, index) => <Field key={index} line={line} />
            )}
          <RequestStats draft={draft} />
        </Grid>
      </Grid>
    </>
  );
};
