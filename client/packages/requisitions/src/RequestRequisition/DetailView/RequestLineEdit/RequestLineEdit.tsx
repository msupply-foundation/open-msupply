import React from 'react';
import { useTranslation } from '@common/intl';
import {
  ItemRowFragment,
  ReasonOptionsSearchInput,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import {
  BarIcon,
  Box,
  FnUtils,
  InputWithLabelRow,
  InsertRequestRequisitionLineInput,
  NumericTextInput,
  NumUtils,
  Popover,
  ReasonOptionNodeType,
  Switch,
  TextArea,
  useAuthContext,
  useNavigate,
  useToggle,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './hooks';
import { Footer } from './Footer';
import { RequestStats } from './ItemCharts/RequestStats';
import { RequestLineFragment } from '../../api';
import { buildItemEditRoute } from '../utils';
import { ItemInformationView } from './ItemInformation';

const INPUT_WIDTH = 100;
const LABEL_WIDTH = '150px';

interface RequestLineEditProps {
  item?: ItemRowFragment | null;
  draft?: DraftRequestLine | null;
  update: (patch: Partial<DraftRequestLine>) => void;
  save?: () => void;
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
  isProgram: boolean;
  isPacksEnabled: boolean;
  isPacks: boolean;
  setIsPacks: (isPacks: boolean) => void;
  lines: RequestLineFragment[];
  requisitionNumber?: number;
  requisitionId: string;
  insert: (patch: InsertRequestRequisitionLineInput) => void;
  scrollIntoView: () => void;
}

export const RequestLineEdit = ({
  draft,
  update,
  save,
  hasNext,
  next,
  hasPrevious,
  previous,
  isProgram,
  isPacksEnabled,
  isPacks,
  setIsPacks,
  lines,
  requisitionNumber,
  requisitionId,
  insert,
  scrollIntoView,
}: RequestLineEditProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { isOn, toggle } = useToggle();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { store } = useAuthContext();
  const useConsumptionData =
    store?.preferences?.useConsumptionAndStockFromCustomersForInternalOrders;
  const isNew = !draft?.id;
  const showItemInformation =
    useConsumptionData && !!draft?.itemInformation && isProgram;
  const itemInformationSorted = draft?.itemInformation
    ?.sort((a, b) => a.name.name.localeCompare(b.name.name))
    .sort((a, b) => b.amcInUnits - a.amcInUnits)
    .sort((a, b) => b.stockInUnits - a.stockInUnits);
  return (
    <Box display="flex" flexDirection="column" padding={2}>
      <Box display="flex" justifyContent="space-between">
        {isNew ? (
          <Box width="100%">
            <StockItemSearchInput
              onChange={(newItem: ItemRowFragment | null) => {
                if (newItem) {
                  insert({
                    id: FnUtils.generateUUID(),
                    requisitionId: requisitionId,
                    itemId: newItem.id,
                  });
                  navigate(buildItemEditRoute(requisitionNumber, newItem.id));
                }
              }}
              openOnFocus={true}
              extraFilter={item =>
                !lines.some(line => line.item.id === item.id)
              }
            />
          </Box>
        ) : (
          <>
            <Box paddingLeft={4} paddingRight={7}>
              {/* Left column content */}
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    width={INPUT_WIDTH}
                    value={draft?.itemStats.availableStockOnHand}
                    disabled
                    autoFocus
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.stock-on-hand')}
                sx={{ marginBottom: 1 }}
              />
              {isProgram && useConsumptionData && (
                <>
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.incomingUnits}
                        disabled
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.incoming-stock')}
                    sx={{ marginBottom: 1 }}
                  />
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.outgoingUnits}
                        disabled
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.outgoing')}
                    sx={{ marginBottom: 1 }}
                  />
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.lossInUnits}
                        disabled
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.losses')}
                    sx={{ marginBottom: 1 }}
                  />
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.additionInUnits}
                        disabled
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.additions')}
                    sx={{ marginBottom: 1 }}
                  />
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.expiringUnits}
                        disabled
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.short-expiry')}
                    sx={{ marginBottom: 1 }}
                  />
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.daysOutOfStock}
                        disabled
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.days-out-of-stock')}
                    sx={{ marginBottom: 1 }}
                  />
                </>
              )}
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    width={INPUT_WIDTH}
                    value={NumUtils.round(
                      draft?.itemStats.averageMonthlyConsumption ?? 0,
                      2
                    )}
                    decimalLimit={2}
                    disabled
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.amc')}
                sx={{ marginBottom: 1 }}
              />
              {isProgram && useConsumptionData && (
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={draft?.itemStats.availableMonthsOfStockOnHand ?? 0}
                      disabled
                      decimalLimit={2}
                      sx={{ marginBottom: 1 }}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.months-of-stock')}
                />
              )}
            </Box>
            <Box>
              {/* Right column content */}
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="flex-end"
                paddingBottom={1}
                paddingRight={2.5}
              >
                {isPacksEnabled && (
                  <Box display="flex">
                    <Switch
                      label={t('label.units')}
                      checked={isPacks}
                      onChange={(_event, checked) => setIsPacks(checked)}
                      size="small"
                    />
                    <Box paddingLeft={2} paddingRight={2}>
                      {t('label.packs')}
                    </Box>
                  </Box>
                )}
              </Box>

              <Box display="flex" flexDirection="row">
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={Math.ceil(draft?.requestedQuantity)}
                      disabled={isPacks}
                      onChange={value => {
                        const newValue = isNaN(Number(value)) ? 0 : value;
                        if (draft?.suggestedQuantity === newValue) {
                          update({
                            requestedQuantity: newValue,
                            reason: null,
                          });
                        } else {
                          update({ requestedQuantity: newValue });
                        }
                      }}
                      onBlur={save}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.requested-quantity')}
                  sx={{ marginBottom: 1 }}
                />
                <Box
                  paddingLeft={1}
                  paddingTop={0.5}
                  onClick={e => {
                    toggle();
                    setAnchorEl(e?.currentTarget);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <BarIcon
                    sx={{
                      color: 'primary.main',
                      backgroundColor: 'background.drawer',
                      borderRadius: '30%',
                      padding: '2px',
                    }}
                  />
                  {isOn && (
                    <Popover
                      anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
                      anchorEl={anchorEl}
                      open={isOn}
                    >
                      <RequestStats draft={draft} />
                    </Popover>
                  )}
                </Box>
              </Box>
              <Box display="flex" flexDirection="row">
                {isPacksEnabled && (
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        disabled={!isPacks}
                        value={NumUtils.round(
                          (draft?.requestedQuantity ?? 0) /
                            (draft?.defaultPackSize ?? 1),
                          2
                        )}
                        decimalLimit={2}
                        width={100}
                        onChange={value => {
                          const newValue =
                            (value ?? 0) * (draft?.defaultPackSize ?? 0);
                          if (draft?.suggestedQuantity === newValue) {
                            update({
                              requestedQuantity: newValue,
                              reason: null,
                            });
                          } else {
                            update({ requestedQuantity: newValue });
                          }
                        }}
                        onBlur={save}
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    sx={{ marginBottom: 1 }}
                    label={t('label.requested-packs')}
                  />
                )}
              </Box>
              {isPacksEnabled ? (
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={draft?.defaultPackSize}
                      disabled
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.default-pack-size')}
                  sx={{ marginBottom: 1 }}
                />
              ) : null}
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    width={INPUT_WIDTH}
                    value={NumUtils.round(draft?.suggestedQuantity, 2)}
                    disabled
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.suggested-quantity')}
                sx={{ marginBottom: 1 }}
              />
              {isProgram && useConsumptionData && (
                <InputWithLabelRow
                  Input={
                    <ReasonOptionsSearchInput
                      value={draft?.reason}
                      onChange={value => {
                        update({ reason: value });
                      }}
                      width={200}
                      type={ReasonOptionNodeType.RequisitionLineVariance}
                      isDisabled={
                        draft?.requestedQuantity === draft?.suggestedQuantity
                      }
                      onBlur={save}
                    />
                  }
                  labelWidth={'66px'}
                  label={t('label.reason')}
                  sx={{ marginBottom: 1 }}
                />
              )}
              <InputWithLabelRow
                Input={
                  <TextArea
                    value={draft?.comment ?? ''}
                    onChange={e => update({ comment: e.target.value })}
                    InputProps={{
                      sx: {
                        backgroundColor: theme => theme.palette.background.menu,
                      },
                    }}
                    onBlur={save}
                  />
                }
                sx={{ width: 275 }}
                labelWidth={LABEL_WIDTH}
                label={t('label.comment')}
              />
            </Box>
          </>
        )}
      </Box>
      {showItemInformation && (
        <Box paddingTop={1} maxHeight={200} width="100%" display="flex">
          <ItemInformationView
            itemInformation={itemInformationSorted}
            storeNameId={store?.nameId}
          />
        </Box>
      )}
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionNumber={draft?.requisitionNumber}
          scrollIntoView={scrollIntoView}
        />
      </Box>
    </Box>
  );
};
