import React, { useState } from 'react';
import {
  BasicSpinner,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import {
  useStockList,
  LocationSearchInput,
  LocationRowFragment,
  MasterListSearchInput,
  MasterListRowFragment,
} from '@openmsupply-client/system';
import {
  Box,
  Formatter,
  StockLineFilterInput,
  useNavigate,
} from '@openmsupply-client/common';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';

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
  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });
  const [{ location, masterList, expiryDate, createBlankStocktake }, setState] =
    useState<ModalState>({
      location: null,
      masterList: null,
      expiryDate: null,
      createBlankStocktake: false,
    });

  const stockFilter: StockLineFilterInput = {
    location: location
      ? {
          id: { equalTo: location.id },
        }
      : null,
    masterList: masterList
      ? {
          id: { equalTo: masterList.id },
        }
      : null,
    expiryDate: expiryDate
      ? { beforeOrEqualTo: Formatter.naiveDate(expiryDate) }
      : null,
    hasPacksInStore: true,
  };

  const { data } = useStockList({
    filterBy: stockFilter,
  });

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
      createBlankStocktake,
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
              <Typography padding={1}>
                {t('messages.create-stocktake-1')}
              </Typography>
              <Typography padding={1}>
                {t('messages.create-stocktake-2')}
              </Typography>
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <Checkbox
                    style={{ paddingLeft: 0 }}
                    checked={!!createBlankStocktake}
                    onChange={e =>
                      setState(prev => ({
                        ...prev,
                        createBlankStocktake: e.target.checked,
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
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <LocationSearchInput
                    disabled={!!createBlankStocktake}
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
                    disabled={!!createBlankStocktake}
                    value={expiryDate}
                    onChange={expiryDate =>
                      setState(prev => ({ ...prev, expiryDate }))
                    }
                  />
                }
                label={t('label.items-expiring-before')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={`${data?.totalCount}`}
                label={t('label.stock-lines-found')}
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
