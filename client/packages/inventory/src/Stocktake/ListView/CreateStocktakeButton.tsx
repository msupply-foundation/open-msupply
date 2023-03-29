import React, { useEffect, useState } from 'react';
import {
  BasicSpinner,
  ButtonWithIcon,
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
  InsertStocktakeInput,
  useAuthContext,
} from '@openmsupply-client/common';

interface CreateStocktakeArgs {
  masterListId: string;
  locationId: string;
}

const DEFAULT_ARGS: CreateStocktakeArgs = {
  masterListId: '',
  locationId: '',
};

export const CreateStocktakeButton: React.FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('inventory');
  const { mutateAsync, isLoading: isSaving } = useStocktake.document.insert();
  const {
    data: masterListData,
    isLoading: isLoadingMasterLists,
    mutate: fetchMasterLists,
  } = useMasterList.document.listAll({ key: 'name', direction: 'asc' });
  const {
    data: locationData,
    isLoading: isLoadingLocations,
    mutate: fetchLocations,
  } = useLocation.document.listAll({ key: 'name', direction: 'asc' });
  const { user } = useAuthContext();
  const { localisedDate } = useFormatDateTime();
  const [createStocktakeArgs, setCreateStocktakeArgs] =
    useState<CreateStocktakeArgs>(DEFAULT_ARGS);

  const generateComment = () => {
    const { locationId, masterListId } = createStocktakeArgs;
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
  };

  const onChange = async () => {
    const description = t('stocktake.description-template', {
      username: user ? user.name : 'unknown user',
      date: localisedDate(new Date()),
    });
    const { locationId, masterListId } = createStocktakeArgs;
    const input: InsertStocktakeInput = {
      id: FnUtils.generateUUID(),
      description,
      masterListId: masterListId ? masterListId : undefined,
      locationId: locationId ? locationId : undefined,
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
      label: `${list.name} (${list.lines?.totalCount} ${t('label.item', {
        count: list.lines?.totalCount,
      })})`,
      value: list.id,
    })) || [];

  const locations =
    locationData?.nodes.map(location => ({
      label: location.name,
      value: location.id,
    })) || [];

  const isLoading = isLoadingMasterLists || isLoadingLocations;

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
