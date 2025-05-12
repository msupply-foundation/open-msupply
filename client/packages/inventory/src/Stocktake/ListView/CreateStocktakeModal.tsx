import React, { useState } from 'react';
import {
  BasicSpinner,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import {
  useStockList,
  LocationSearchInput,
  LocationRowFragment,
  MasterListSearchInput,
  MasterListRowFragment,
} from '@openmsupply-client/system';
import { Box, Formatter } from '@openmsupply-client/common';
import {
  CreateStocktakeInput,
  defaultCreateStocktakeInput,
} from '../api/hooks/useStocktake';

const LABEL_FLEX = '0 0 150px';
interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  navigate: (id: string) => void;
  description?: string;
}

// Intended behaviour is for the stocktake to generate based on one of the available argument selections only - the user cannot select multiple at once.

export const CreateStocktakeModal = ({
  open,
  onClose,
  onCreate,
  isCreating,
  navigate,
  description,
}: NewStocktakeModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });
  const { data: stockData, isLoading: stockIsLoading } = useStockList({
    sortBy: {
      key: 'expiryDate',
      direction: 'asc',
    },
  });
  const [createStocktakeArgs, setCreateStocktakeArgs] =
    useState<CreateStocktakeInput>(defaultCreateStocktakeInput);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRowFragment | null>(null);
  const [selectedMasterList, setSelectedMasterList] =
    useState<MasterListRowFragment | null>(null);

  const { localisedDate } = useFormatDateTime();

  const generateComment = () => {
    const { locationId, masterListId, itemsHaveStock, expiresBefore } =
      createStocktakeArgs;
    if (masterListId && selectedMasterList) {
      return t('stocktake.comment-list-template', {
        list: selectedMasterList.name,
      });
    }

    if (locationId && selectedLocation) {
      return t('stocktake.comment-location-template', {
        location: selectedLocation.code,
      });
    }

    if (itemsHaveStock) {
      return t('stocktake-comment-items-have-stock-template');
    }
    if (expiresBefore) {
      return t('stocktake.comment-expires-before-template', {
        date: localisedDate(expiresBefore),
      });
    }
  };

  const onSave = () => {
    const { locationId, masterListId, itemsHaveStock, expiresBefore } =
      createStocktakeArgs;
    const args: CreateStocktakeInput = {
      masterListId: masterListId ? masterListId : undefined,
      locationId: locationId ? locationId : undefined,
      itemsHaveStock: itemsHaveStock ? itemsHaveStock : undefined,
      expiresBefore: expiresBefore ? expiresBefore : undefined,
      // max of one of the above args should be defined per stocktake
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
        cancelButton={
          <DialogButton
            disabled={stockIsLoading}
            variant="cancel"
            onClick={onClose}
          />
        }
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
                  <MasterListSearchInput
                    onChange={masterList => {
                      setSelectedMasterList(masterList);
                      setCreateStocktakeArgs({
                        ...defaultCreateStocktakeInput,
                        masterListId: masterList?.id ?? '',
                      });
                    }}
                    disabled={false}
                    selectedMasterList={
                      createStocktakeArgs.masterListId
                        ? selectedMasterList
                        : null
                    }
                    width={380}
                  />
                }
                label={t('label.master-list')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <LocationSearchInput
                    onChange={location => {
                      setSelectedLocation(location);
                      setCreateStocktakeArgs({
                        ...defaultCreateStocktakeInput,
                        locationId: location?.id ?? '',
                      });
                    }}
                    width={380}
                    disabled={false}
                    selectedLocation={
                      createStocktakeArgs.locationId ? selectedLocation : null
                    }
                  />
                }
                label={t('label.location')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  !stockData ? (
                    <Typography sx={{ color: 'gray.main' }}>
                      {t('messages.no-items-with-stock')}
                    </Typography>
                  ) : (
                    <Checkbox
                      style={{ paddingLeft: 0 }}
                      checked={!!createStocktakeArgs.itemsHaveStock}
                      onChange={event => {
                        setCreateStocktakeArgs({
                          ...defaultCreateStocktakeInput,
                          itemsHaveStock: event.target.checked,
                        });
                      }}
                    />
                  )
                }
                label={t('label.items-with-stock')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <DateTimePickerInput
                    value={
                      createStocktakeArgs.expiresBefore
                        ? new Date(createStocktakeArgs.expiresBefore)
                        : null
                    }
                    onChange={date => {
                      setCreateStocktakeArgs({
                        ...defaultCreateStocktakeInput,
                        expiresBefore: Formatter.naiveDate(date) ?? null,
                      });
                    }}
                  />
                }
                label={t('label.items-expiring-before')}
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
