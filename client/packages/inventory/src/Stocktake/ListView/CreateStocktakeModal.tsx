import React, { useState } from 'react';
import {
  BasicSpinner,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
} from '@common/components';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
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
  PreferenceKey,
  StockLineFilterInput,
  useNavigate,
  usePreference,
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
  location: LocationRowFragment | null;
  masterList: MasterListRowFragment | null;
  expiryDate: Date | null;
  createBlankStocktake: boolean;
  includeAllMasterListItems: boolean;
  vvmStatus: VvmStatusFragment | null;
}

export const CreateStocktakeModal = ({
  open,
  onClose,
  onCreate,
  isCreating,
  description,
}: NewStocktakeModalProps) => {
  const navigate = useNavigate();
  const t = useTranslation();

  const { data: preferences } = usePreference(
    PreferenceKey.ManageVvmStatusForStock
  );

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });

  const [
    {
      location,
      masterList,
      vvmStatus,
      expiryDate,
      createBlankStocktake,
      includeAllMasterListItems,
    },
    setState,
  ] = useState<ModalState>({
    location: null,
    vvmStatus: null,
    masterList: null,
    expiryDate: null,
    createBlankStocktake: false,
    includeAllMasterListItems: false,
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
  };

  const { data } = useStockListCount(stockFilter);
  const { data: masterListLineCount } = useMasterListLineCount(masterList?.id);

  const { localisedDate } = useFormatDateTime();

  const generateComment = () => {
    if (createBlankStocktake) return '';

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
      createBlankStocktake,
      expiresBefore: Formatter.naiveDate(adjustedExpiryDate),
      isInitialStocktake: false,
      includeAllMasterListItems,
      description,
      comment: generateComment(),
    };
    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  let estimatedLineCount = 0;
  if (createBlankStocktake) {
    estimatedLineCount = 0;
  } else {
    const stockCount = data?.totalCount ?? 0;
    estimatedLineCount =
      includeAllMasterListItems && masterListLineCount
        ? Math.max(masterListLineCount, stockCount)
        : stockCount;
  }

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
                  <Checkbox
                    style={{ paddingLeft: 0 }}
                    checked={!!createBlankStocktake}
                    onChange={e =>
                      setState(() => ({
                        createBlankStocktake: e.target.checked,
                        masterList: null,
                        includeAllMasterListItems: false,
                        location: null,
                        expiryDate: null,
                        vvmStatus: null,
                      }))
                    }
                  />
                }
                label={t('stocktake.create-blank')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <MasterListSearchInput
                    disabled={!!createBlankStocktake}
                    onChange={masterList =>
                      setState(prev => ({ ...prev, masterList }))
                    }
                    selectedMasterList={masterList}
                    width={380}
                  />
                }
                label={t('label.master-list')}
              />
              {masterList ? (
                <InputWithLabelRow
                  labelProps={{ sx: { flex: `0 0 250px` } }}
                  sx={{ paddingLeft: '160px' }}
                  Input={
                    <Checkbox
                      style={{ paddingLeft: 0 }}
                      disabled={!masterList || createBlankStocktake}
                      checked={!!includeAllMasterListItems}
                      onChange={e =>
                        setState(prev => ({
                          ...prev,
                          includeAllMasterListItems: e.target.checked,
                          vvmStatus: null,
                          location: null,
                          expiryDate: null,
                        }))
                      }
                    />
                  }
                  label={t('stocktake.all-master-list-items')}
                  labelRight={true}
                />
              ) : null}
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <LocationSearchInput
                    disabled={
                      !!createBlankStocktake || includeAllMasterListItems
                    }
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
                    width={'100%'}
                    disabled={
                      !!createBlankStocktake || includeAllMasterListItems
                    }
                    value={expiryDate}
                    onChange={expiryDate =>
                      setState(prev => ({ ...prev, expiryDate }))
                    }
                  />
                }
                label={t('label.items-expiring-before')}
              />

              {preferences?.manageVvmStatusForStock && (
                <InputWithLabelRow
                  label={t('label.vvm-status')}
                  labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                  Input={
                    <VVMStatusSearchInput
                      disabled={
                        !!createBlankStocktake || includeAllMasterListItems
                      }
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
                Input={estimatedLineCount}
                label={t('label.stocktake-estimated-lines')}
              />
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
