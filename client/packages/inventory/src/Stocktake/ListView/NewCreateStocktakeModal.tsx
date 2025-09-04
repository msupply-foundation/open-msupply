import React, { useState } from 'react';
import {
  Alert,
  BasicSpinner,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  RadioGroup,
} from '@common/components';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import { FormControlLabel, Radio } from '@mui/material';
import { useDialog } from '@common/hooks';
import {
  useStockListCount,
  LocationSearchInput,
  LocationRowFragment,
  MasterListSearchInput,
  MasterListRowFragment,
  useMasterListLineCount,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import {
  Box,
  Formatter,
  StockLineFilterInput,
  useNavigate,
  usePreferences,
} from '@openmsupply-client/common';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';
import { VvmStatusFragment } from 'packages/system/src/Stock/api';

const LABEL_FLEX = '0 0 150px';
interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  description?: string;
}

interface ModalState {
  masterList: MasterListRowFragment | null;
  vvmStatus: VvmStatusFragment | null;
  location: LocationRowFragment | null;
  expiryDate: Date | null;
  itemStatus: ItemStatus;
}

enum ItemStatus {
  All = 'all',
  InStock = 'in stock',
  None = 'none',
}

export const NewCreateStocktakeModal = ({
  open,
  onClose,
  onCreate,
  isCreating,
  description,
}: NewStocktakeModalProps) => {
  const navigate = useNavigate();
  const t = useTranslation();

  const { manageVvmStatusForStock } = usePreferences();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });

  const [
    { location, masterList, vvmStatus, expiryDate, itemStatus },
    setState,
  ] = useState<ModalState>({
    location: null,
    vvmStatus: null,
    masterList: null,
    expiryDate: null,
    itemStatus: ItemStatus.InStock,
  });

  const stockFilter: StockLineFilterInput = {
    location: location && {
      id: { equalTo: location.id },
    },
    masterList: masterList && {
      id: { equalTo: masterList.id },
    },
    expiryDate: expiryDate && {
      beforeOrEqualTo: Formatter.naiveDate(expiryDate),
    },
    vvmStatusId: vvmStatus && {
      equalTo: vvmStatus.id,
    },
    hasPacksInStore: true,
  };

  const { data } = useStockListCount(stockFilter);
  const { data: masterListLineCount } = useMasterListLineCount(masterList?.id);

  const { localisedDate } = useFormatDateTime();

  const generateComment = () => {
    if (itemStatus === ItemStatus.None) return '';

    const filterComments: string[] = [];

    if (!!masterList) {
      filterComments.push(
        t('stocktake.master-list-template', {
          masterList: masterList.name,
        })
      );
    }
    if (!!location) {
      filterComments.push(
        t('stocktake.location-template', {
          location: location.code,
        })
      );
    }
    if (!!expiryDate) {
      filterComments.push(
        t('stocktake.expires-before-template', {
          date: localisedDate(expiryDate),
        })
      );
    }
    if (!!vvmStatus) {
      filterComments.push(
        t('stocktake.vvm-status-template', {
          vvmStatus: vvmStatus.description,
        })
      );
    }

    if (filterComments.length === 0) return undefined;
    if (filterComments.length === 1)
      return t('stocktake.comment-template', { filters: filterComments[0] });

    const comments = t('stocktake.comment-and-template', {
      start: filterComments.slice(0, -1).join(', '),
      end: filterComments[filterComments.length - 1],
    });

    return t('stocktake.comment-template', { filters: comments });
  };

  const onSave = () => {
    // Our API only has a `beforeOrEqualTo` filter, so just kludging the date back 1 day here
    const adjustedExpiryDate = expiryDate
      ? DateUtils.addDays(expiryDate, -1)
      : null;

    const args: CreateStocktakeInput = {
      masterListId: masterList?.id,
      locationId: location?.id,
      vvmStatusId: vvmStatus?.id,
      expiresBefore: Formatter.naiveDate(adjustedExpiryDate),
      isInitialStocktake: false,
      description,
      comment: generateComment(),
    };
    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  const estimateLineCount = (suggestedStatus?: ItemStatus): number => {
    const stockCount = data?.totalCount ?? 0;
    if (suggestedStatus === ItemStatus.All) {
      return masterListLineCount
        ? Math.max(masterListLineCount, stockCount)
        : stockCount;
    } else if (suggestedStatus === ItemStatus.InStock) {
      return stockCount;
    } else {
      return itemStatus === ItemStatus.All && masterListLineCount
        ? Math.max(masterListLineCount, stockCount)
        : stockCount;
    }
  };

  return (
    <>
      <Modal
        slideAnimation={false}
        title={t('label.new-stocktake')}
        width={650}
        cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
        okButton={
          <DialogButton
            disabled={isCreating}
            variant="ok"
            onClick={async () => {
              onSave();
              onClose();
            }}
          />
        }
      >
        <Box flex={1} display="flex" justifyContent="center">
          {!isCreating ? (
            <Box paddingLeft={2} display="flex" flexDirection="column" gap={2}>
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <MasterListSearchInput
                    disabled={itemStatus == ItemStatus.None}
                    onChange={masterList =>
                      setState(prev => ({
                        ...prev,
                        masterList,
                        itemStatus: ItemStatus.InStock,
                      }))
                    }
                    selectedMasterList={masterList}
                    width={380}
                  />
                }
                label={t('label.master-list')}
              />

              <InputWithLabelRow
                labelProps={{
                  sx: { flex: `${LABEL_FLEX}` },
                }}
                Input={
                  <LocationSearchInput
                    disabled={itemStatus != ItemStatus.InStock}
                    onChange={location =>
                      setState(prev => ({ ...prev, location }))
                    }
                    width={380}
                    selectedLocation={location}
                  />
                }
                label={t('label.location')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <DateTimePickerInput
                    width={380}
                    disabled={itemStatus != ItemStatus.InStock}
                    value={expiryDate}
                    onChange={expiryDate =>
                      setState(prev => ({ ...prev, expiryDate }))
                    }
                  />
                }
                label={t('label.items-expiring-before')}
              />
              {manageVvmStatusForStock && (
                <InputWithLabelRow
                  label={t('label.vvm-status')}
                  labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                  Input={
                    <VVMStatusSearchInput
                      disabled={itemStatus != ItemStatus.InStock}
                      onChange={vvmStatus =>
                        setState(prev => ({
                          ...prev,
                          vvmStatus: vvmStatus ?? null,
                        }))
                      }
                      width={380}
                      selected={vvmStatus}
                    />
                  }
                />
              )}

              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <RadioGroup
                    value={itemStatus}
                    sx={{ margin: '0 auto' }}
                    onChange={event => {
                      setState(prev => ({
                        ...prev,
                        itemStatus: event.target.value as ItemStatus,
                      }));
                    }}
                  >
                    <FormControlLabel
                      value={ItemStatus.InStock}
                      control={<Radio />}
                      label={t('report.in-stock')}
                    />
                    <FormControlLabel
                      disabled={
                        expiryDate || location || vvmStatus ? true : false
                      }
                      value={ItemStatus.All}
                      control={<Radio />}
                      label={t('label.all')}
                    />
                    <FormControlLabel
                      disabled={
                        masterList || expiryDate || location || vvmStatus
                          ? true
                          : false
                      }
                      value={ItemStatus.None}
                      control={<Radio />}
                      label={
                        t('label.none') +
                        ' (' +
                        t('label.blank-stocktake') +
                        ')'
                      }
                    />
                  </RadioGroup>
                }
                label={t('label.item-status')}
              />

              {itemStatus == ItemStatus.None ? (
                <Alert severity="success">
                  {t('message.create-blank-stocktake')}
                </Alert>
              ) : (
                <Alert severity="info">
                  {t('message.lines-estimated', { count: estimateLineCount() })}
                </Alert>
              )}
            </Box>
          ) : (
            <Box sx={{ height: '100%' }}>
              <BasicSpinner messageKey="saving" />
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
};
