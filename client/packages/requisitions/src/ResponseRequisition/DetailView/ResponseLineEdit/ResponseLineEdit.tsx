import React from 'react';
import { useTranslation } from '@common/intl';
import {
  ItemRowFragment,
  ReasonOptionsSearchInput,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { DraftResponseLine } from './hooks';
import {
  BarIcon,
  Box,
  FnUtils,
  InputWithLabelRow,
  InsertResponseRequisitionLineInput,
  NumericTextInput,
  NumUtils,
  Popover,
  ReasonOptionNodeType,
  TextArea,
  useAuthContext,
  useNavigate,
  useToggle,
} from '@openmsupply-client/common';
import { ResponseLineFragment, useResponse } from '../../api';
import { Footer } from './Footer';
import { ResponseStoreStats } from '../ResponseStats/ResponseStoreStats';
import { RequestStoreStats } from '../ResponseStats/RequestStoreStats';
import { buildItemEditRoute } from '../../utils';

const INPUT_WIDTH = 100;
const LABEL_WIDTH = '150px';

interface ResponseLineEditProps {
  item?: ItemRowFragment | null;
  hasLinkedRequisition?: boolean | undefined;
  hasApproval?: boolean | undefined;
  draft?: DraftResponseLine | null;
  update: (patch: Partial<DraftResponseLine>) => void;
  save?: () => void;
  hasNext: boolean;
  next: ItemRowFragment | null;
  hasPrevious: boolean;
  previous: ItemRowFragment | null;
  isProgram: boolean;
  lines: ResponseLineFragment[];
  requisitionId: string;
  insert: (patch: InsertResponseRequisitionLineInput) => void;
  scrollIntoView: () => void;
  disabled?: boolean;
}

export const ResponseLineEdit = ({
  hasLinkedRequisition,
  hasApproval,
  draft,
  update,
  save,
  hasNext,
  next,
  hasPrevious,
  previous,
  isProgram,
  lines,
  requisitionId,
  insert,
  scrollIntoView,
  disabled: isFinalised,
}: ResponseLineEditProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store } = useAuthContext();
  const { isOn: ourStats, toggle: toggleOurStats } = useToggle();
  const { isOn: theirStats, toggle: toggleTheirStats } = useToggle();
  const { data } = useResponse.line.stats(draft?.id);
  const [ourStatsAnchorEl, setOurStatsAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const [theirStatsAnchorEl, setTheirStatsAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const isNew = !draft;

  const incomingStock =
    (draft?.incomingUnits ?? 0) + (draft?.additionInUnits ?? 0);
  const outgoingStock = (draft?.lossInUnits ?? 0) + (draft?.outgoingUnits ?? 0);

  const available =
    (draft?.initialStockOnHandUnits ?? 0) + incomingStock - outgoingStock;

  const MOS =
    draft?.averageMonthlyConsumption !== 0
      ? available / (draft?.averageMonthlyConsumption ?? 1)
      : 0;

  return (
    <Box>
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
                  navigate(buildItemEditRoute(requisitionId, newItem.id), {
                    replace: true,
                  });
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
                    value={data?.responseStoreStats.stockOnHand}
                    disabled={true}
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.our-soh')}
                sx={{ marginBottom: 1 }}
              />
              {!isProgram ? (
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={draft?.availableStockOnHand}
                      onChange={value =>
                        update({ availableStockOnHand: value })
                      }
                      onBlur={save}
                      disabled={!!hasLinkedRequisition || isFinalised}
                      autoFocus
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.customer-soh')}
                  sx={{ marginBottom: 1 }}
                />
              ) : (
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={draft?.initialStockOnHandUnits}
                      onChange={value =>
                        update({ initialStockOnHandUnits: value })
                      }
                      onBlur={save}
                      disabled={!!hasLinkedRequisition || isFinalised}
                      autoFocus
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.initial-stock-on-hand')}
                  sx={{ marginBottom: 1 }}
                />
              )}
              {isProgram && store?.preferences.extraFieldsInRequisition && (
                <>
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.incomingUnits}
                        onChange={value => update({ incomingUnits: value })}
                        onBlur={save}
                        disabled={isFinalised}
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
                        onChange={value => update({ outgoingUnits: value })}
                        onBlur={save}
                        disabled={isFinalised}
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
                        onChange={value => update({ lossInUnits: value })}
                        onBlur={save}
                        disabled={isFinalised}
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
                        onChange={value => update({ additionInUnits: value })}
                        onBlur={save}
                        disabled={isFinalised}
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
                        onChange={value => update({ expiringUnits: value })}
                        onBlur={save}
                        disabled={isFinalised}
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
                        onChange={value => update({ daysOutOfStock: value })}
                        onBlur={save}
                        disabled={isFinalised}
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
                      draft?.averageMonthlyConsumption ?? 0,
                      2
                    )}
                    onChange={value =>
                      update({ averageMonthlyConsumption: value })
                    }
                    decimalLimit={2}
                    onBlur={save}
                    disabled={!!hasLinkedRequisition || isFinalised}
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.amc')}
                sx={{ marginBottom: 1 }}
              />
              {isProgram && store?.preferences.extraFieldsInRequisition && (
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={MOS}
                      disabled
                      decimalLimit={2}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.months-of-stock')}
                />
              )}
            </Box>
            <Box>
              {/* Right column content */}
              <Box display="flex" flexDirection="row">
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={draft?.requestedQuantity}
                      onChange={value => {
                        if (draft?.suggestedQuantity === value) {
                          update({ requestedQuantity: value, reason: null });
                        } else {
                          update({ requestedQuantity: value });
                        }
                      }}
                      disabled={!!hasLinkedRequisition || isFinalised}
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
                    toggleTheirStats();
                    setTheirStatsAnchorEl(e?.currentTarget);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  {hasLinkedRequisition && (
                    <>
                      <BarIcon
                        sx={{
                          color: 'primary.main',
                          backgroundColor: 'background.drawer',
                          borderRadius: '30%',
                          padding: '2px',
                        }}
                      />
                      {theirStats && (
                        <Popover
                          anchorOrigin={{
                            vertical: 'center',
                            horizontal: 'left',
                          }}
                          anchorEl={theirStatsAnchorEl}
                          open={theirStats}
                        >
                          <RequestStoreStats
                            item={draft?.item}
                            maxMonthsOfStock={
                              data?.requestStoreStats.maxMonthsOfStock || 0
                            }
                            suggestedQuantity={
                              data?.requestStoreStats.suggestedQuantity || 0
                            }
                            availableStockOnHand={
                              data?.requestStoreStats.stockOnHand || 0
                            }
                            averageMonthlyConsumption={
                              data?.requestStoreStats
                                .averageMonthlyConsumption || 0
                            }
                          />
                        </Popover>
                      )}
                    </>
                  )}
                </Box>
              </Box>
              {hasApproval && (
                <Box>
                  <InputWithLabelRow
                    Input={
                      <NumericTextInput
                        width={INPUT_WIDTH}
                        value={draft?.approvedQuantity}
                        disabled={isFinalised}
                      />
                    }
                    labelWidth={LABEL_WIDTH}
                    label={t('label.approved-quantity')}
                    sx={{ marginBottom: 1 }}
                  />
                </Box>
              )}
              {isProgram && store?.preferences.extraFieldsInRequisition && (
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={available}
                      disabled
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.available')}
                  sx={{ marginBottom: 1 }}
                />
              )}
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    width={INPUT_WIDTH}
                    value={draft?.alreadyIssued}
                    disabled
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.already-issued')}
                sx={{ marginBottom: 1 }}
              />
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    width={INPUT_WIDTH}
                    value={draft?.suggestedQuantity}
                    disabled
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.suggested-quantity')}
                sx={{ marginBottom: 1 }}
              />
              <InputWithLabelRow
                Input={
                  <NumericTextInput
                    width={INPUT_WIDTH}
                    value={Math.max(
                      (draft?.supplyQuantity ?? 0) -
                        (draft?.alreadyIssued ?? 0),
                      0
                    )}
                    disabled
                  />
                }
                labelWidth={LABEL_WIDTH}
                label={t('label.remaining-to-supply')}
                sx={{ marginBottom: 1 }}
              />
              <Box display="flex" flexDirection="row">
                <InputWithLabelRow
                  Input={
                    <NumericTextInput
                      width={INPUT_WIDTH}
                      value={draft?.supplyQuantity}
                      onChange={value => update({ supplyQuantity: value })}
                      onBlur={save}
                      disabled={isFinalised}
                    />
                  }
                  labelWidth={LABEL_WIDTH}
                  label={t('label.supply-quantity')}
                  sx={{ marginBottom: 1 }}
                />
                <Box
                  paddingLeft={1}
                  paddingTop={0.5}
                  onClick={e => {
                    toggleOurStats();
                    setOurStatsAnchorEl(e?.currentTarget);
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
                  {ourStats && (
                    <Popover
                      anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
                      anchorEl={ourStatsAnchorEl}
                      open={ourStats}
                    >
                      <ResponseStoreStats
                        item={draft?.item}
                        stockOnHand={data?.responseStoreStats.stockOnHand || 0}
                        incomingStock={
                          data?.responseStoreStats.incomingStock || 0
                        }
                        stockOnOrder={
                          data?.responseStoreStats.stockOnOrder || 0
                        }
                        requestedQuantity={
                          data?.responseStoreStats.requestedQuantity || 0
                        }
                        otherRequestedQuantity={
                          data?.responseStoreStats.otherRequestedQuantity || 0
                        }
                      />
                    </Popover>
                  )}
                </Box>
              </Box>
              {isProgram && store?.preferences.extraFieldsInRequisition && (
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
                        draft?.requestedQuantity === draft?.suggestedQuantity ||
                        !!hasLinkedRequisition ||
                        isFinalised
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
                    slotProps={{
                      input: {
                        sx: {
                          backgroundColor: theme =>
                            theme.palette.background.menu,
                        },
                      },
                    }}
                    onBlur={save}
                    disabled={isFinalised}
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
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionId={draft?.requisitionId}
          scrollIntoView={scrollIntoView}
        />
      </Box>
    </Box>
  );
};
