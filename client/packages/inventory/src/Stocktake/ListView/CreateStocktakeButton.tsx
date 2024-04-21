import React, { useEffect, useState } from 'react';
import {
  BasicSpinner,
  ButtonWithIcon,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  Select,
  Typography,
} from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { ToggleState, useDialog } from '@common/hooks';
import { useStocktake } from '../api';
import { useMasterList, useLocation } from '@openmsupply-client/system';
import {
  Box,
  FnUtils,
  Formatter,
  InsertStocktakeInput,
  useAuthContext,
} from '@openmsupply-client/common';
import { useStock } from '@openmsupply-client/system';

const LABEL_FLEX = '0 0 150px';

interface CreateStocktakeArgs {
  masterListId: string;
  locationId: string;
  itemsHaveStock: boolean;
  expiresBefore: Date | null;
}

const DEFAULT_ARGS: CreateStocktakeArgs = {
  masterListId: '',
  locationId: '',
  itemsHaveStock: false,
  expiresBefore: null,
};

export const CreateStocktakeButton: React.FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('inventory');
  const { mutateAsync, isLoading: isSaving } = useStocktake.document.insert();
  const { user, storeId } = useAuthContext();
  const {
    data: masterListData,
    isLoading: isLoadingMasterLists,
    mutate: fetchMasterLists,
  } = useMasterList.document.listAll(
    {
      key: 'name',
      direction: 'asc',
    },
    { existsForStoreId: { equalTo: storeId } }
  );
  const {
    data: locationData,
    isLoading: isLoadingLocations,
    mutate: fetchLocations,
  } = useLocation.document.listAll({ key: 'name', direction: 'asc' });
  const { data: stockData, isLoading: isLoadingStock } = useStock.line.sorted({
    key: 'expiryDate',
    direction: 'asc',
  });
  const { localisedDate } = useFormatDateTime();
  const [createStocktakeArgs, setCreateStocktakeArgs] =
    useState<CreateStocktakeArgs>(DEFAULT_ARGS);

  const generateComment = () => {
    const { locationId, masterListId, itemsHaveStock } = createStocktakeArgs;
    if (masterListId) {
      const masterList = masterListData?.nodes?.find(
        list => list.id === masterListId
      );
      if (masterList)
        return t('stocktake.comment-list-template', { list: masterList.name });
    }

    if (locationId) {
      const location = locations.find(
        location => location.value === locationId
      );
      if (location)
        return t('stocktake.comment-location-template', {
          location: location.label,
        });
    }

    if (itemsHaveStock) {
      return t('stocktake-comment-items-have-stock-template');
    }
  };

  const onChange = async () => {
    const description = t('stocktake.description-template', {
      username: user ? user.name : 'unknown user',
      date: localisedDate(new Date()),
    });
    const { locationId, masterListId, itemsHaveStock, expiresBefore } =
      createStocktakeArgs;
    const input: InsertStocktakeInput = {
      id: FnUtils.generateUUID(),
      description,
      masterListId: masterListId ? masterListId : undefined,
      location: locationId
        ? {
            value: locationId,
          }
        : undefined,
      itemsHaveStock: itemsHaveStock ? itemsHaveStock : undefined,
      expiresBefore: expiresBefore
        ? Formatter.naiveDate(new Date(expiresBefore))
        : undefined,
      comment: generateComment(),
    };
    await mutateAsync(input);
  };

  const onClose = () => {
    modalController.toggleOff();
    setCreateStocktakeArgs(DEFAULT_ARGS);
  };
  const { Modal } = useDialog({
    isOpen: modalController.isOn,
    onClose,
    disableBackdrop: true,
  });

  const masterLists =
    masterListData?.nodes?.map(list => ({
      label: `${list.name} (${list?.linesCount} ${t('label.item', {
        count: list.linesCount ?? undefined,
      })})`,
      value: list.id,
    })) || [];

  const locations =
    locationData?.nodes.map(location => ({
      label: location.code,
      value: location.id,
    })) || [];

  const isLoading =
    isLoadingMasterLists || isLoadingLocations || isLoadingStock;

  useEffect(() => {
    fetchMasterLists();
    fetchLocations();
  }, []);

  return (
    <>
      {modalController.isOn && (
        <Modal
          slideAnimation={false}
          title={t('label.new-stocktake')}
          cancelButton={
            <DialogButton
              disabled={isLoading}
              variant="cancel"
              onClick={onClose}
            />
          }
          okButton={
            <DialogButton
              disabled={isSaving}
              variant="ok"
              onClick={async () => {
                await onChange();
                onClose();
              }}
            />
          }
        >
          <Box flex={1} display="flex" justifyContent="center">
            {!isSaving ? (
              <Box paddingLeft={2}>
                <Typography padding={1}>
                  {t('messages.create-stocktake-1')}
                </Typography>
                <Typography padding={1} paddingBottom={4}>
                  {t('messages.create-stocktake-2')}
                </Typography>
                <InputWithLabelRow
                  labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                  Input={
                    masterLists.length === 0 ? (
                      <Typography sx={{ color: 'gray.main' }}>
                        {t('messages.no-master-lists')}
                      </Typography>
                    ) : (
                      <Select
                        fullWidth
                        onChange={event =>
                          setCreateStocktakeArgs({
                            ...DEFAULT_ARGS,
                            masterListId: event.target.value?.toString(),
                          })
                        }
                        options={masterLists}
                        value={createStocktakeArgs.masterListId}
                      />
                    )
                  }
                  label={t('label.master-list')}
                />
                <Box sx={{ height: 16 }} />
                <InputWithLabelRow
                  labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                  Input={
                    locations.length === 0 ? (
                      <Typography sx={{ color: 'gray.main' }}>
                        {t('messages.no-locations')}
                      </Typography>
                    ) : (
                      <Select
                        fullWidth
                        onChange={event =>
                          setCreateStocktakeArgs({
                            ...DEFAULT_ARGS,
                            locationId: event.target.value?.toString(),
                          })
                        }
                        options={locations}
                        value={createStocktakeArgs.locationId}
                      />
                    )
                  }
                  label={t('label.location')}
                />
                <Box sx={{ height: 16 }} />
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
                        checked={createStocktakeArgs.itemsHaveStock}
                        onChange={event => {
                          setCreateStocktakeArgs({
                            ...DEFAULT_ARGS,
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
                      value={createStocktakeArgs.expiresBefore}
                      onChange={event => {
                        setCreateStocktakeArgs({
                          ...DEFAULT_ARGS,
                          expiresBefore: event,
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
      )}
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('label.new-stocktake')}
        onClick={modalController.toggleOn}
      />
    </>
  );
};
