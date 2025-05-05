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

interface ReadOnlyFieldProps {
  label: string;
  value?: string | number | null;
  type?: 'text' | 'number' | 'units' | 'months';
}

const ReadOnlyField = ({
  value,
  label,
  type = 'text',
}: ReadOnlyFieldProps): ReactElement => {
  const t = useTranslation();

  const formatValue = (): string => {
    if (type === 'number') return NumUtils.round(Number(value), 2).toString();
    if (type === 'units')
      return t('format.quantity-with-units', { count: Number(value) });
    if (type === 'months')
      return t('format.quantity-with-months', { count: Number(value) });
    return value?.toString() ?? '';
  };

  const displayValue = formatValue();

  return (
    <InputWithLabelRow
      Input={
        <ReadOnlyInput
          value={displayValue}
          style={{ textAlign: 'right' }}
          number={type === 'number'}
        />
      }
      labelWidth={LABEL_WIDTH}
      label={label}
    />
  );
};

interface DetailsProps {
  update: (patch: Partial<DraftRequestLine>) => void;
  plugins: Plugins;
  draft?: DraftRequestLine | null;
  isProgram?: boolean;
  isPacksEnabled?: boolean;
  disabled?: boolean;
  line?: RequestLineFragment;
}

export const Details = ({
  draft,
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

  return (
    <>
      <Grid container spacing={10} direction="row">
        {/* Left Column Content */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={1.5}>
            <ReadOnlyField
              value={draft?.unitName ?? ''}
              label={t('label.unit')}
            />
            {isPacksEnabled ? (
              <ReadOnlyField
                type="units"
                value={draft?.defaultPackSize}
                label={t('label.default-pack-size')}
              />
            ) : null}
            <ReadOnlyField
              type="units"
              value={draft?.itemStats.availableStockOnHand}
              label={t('label.our-soh')}
            />
            <ReadOnlyField
              type="units"
              value={draft?.itemStats.averageMonthlyConsumption}
              label={t('label.amc')}
            />
            {isProgram && useConsumptionData && (
              <>
                <ReadOnlyField
                  type="units"
                  value={draft?.incomingUnits}
                  label={t('label.incoming-stock')}
                />
                <ReadOnlyField
                  type="units"
                  value={draft?.outgoingUnits}
                  label={t('label.outgoing')}
                />
                <ReadOnlyField
                  type="units"
                  value={draft?.lossInUnits}
                  label={t('label.losses')}
                />
                <ReadOnlyField
                  type="units"
                  value={draft?.additionInUnits}
                  label={t('label.additions')}
                />
              </>
            )}
          </Stack>
        </Grid>

        {/* Right Column Content */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack spacing={1.5}>
            <ReadOnlyField
              type="months"
              value={maxMonthsOfStock}
              label={t('label.mos')}
            />
            <ReadOnlyField
              type="months"
              value={minMonthsOfStock ?? maxMonthsOfStock}
              label={t('label.reorder-threshold')}
            />
            <ReadOnlyField
              value={`${formatNumber.round(targetStock)} ${t('label.units-plural', { count: targetStock })}`}
              label={t('label.target-stock')}
            />
            <ReadOnlyField
              type="units"
              value={NumUtils.round(draft?.suggestedQuantity ?? 0)}
              label={t('label.suggested-quantity')}
            />
            {isProgram && useConsumptionData && (
              <>
                <ReadOnlyField
                  type="number"
                  value={draft?.itemStats.availableMonthsOfStockOnHand}
                  label={t('label.months-of-stock')}
                />
                <ReadOnlyField
                  type="units"
                  value={draft?.expiringUnits}
                  label={t('label.short-expiry')}
                />
                <ReadOnlyField
                  type="number"
                  value={draft?.daysOutOfStock}
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
