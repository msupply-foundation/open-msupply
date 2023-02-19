import React, { ChangeEventHandler, useEffect, useState } from 'react';
import {
  BasicSpinner,
  ButtonWithIcon,
  DialogButton,
  InputWithLabelRow,
  Option,
  Select,
  Typography,
} from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import {
  LocaleKey,
  TypedTFunction,
  useFormatDateTime,
  useTranslation,
} from '@common/intl';
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

interface IdName {
  id: string;
  name: string;
  lines?: {
    totalCount: number;
  };
}

const DEFAULT_ARGS: CreateStocktakeArgs = {
  masterListId: '',
  locationId: '',
};

const generateOptions = (
  data: IdName[],
  labelFormatter: (datum: IdName) => string
) =>
  data.map(datum => ({
    label: labelFormatter(datum),
    value: datum.id,
  }));

interface SelectInputProps {
  argument: keyof CreateStocktakeArgs;
  options: Option[];
  value: string;
  label: LocaleKey;
  t: TypedTFunction<LocaleKey>;
  setArgs: (args: CreateStocktakeArgs) => void;
}

const SelectInput: React.FC<SelectInputProps> = ({
  argument,
  options,
  value,
  label,
  t,
  setArgs,
}) => {
  const handleChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = event =>
    setArgs({
      ...DEFAULT_ARGS,
      [argument]: event.target.value?.toString(),
    });

  return (
    <>
      <InputWithLabelRow
        Input={
          <Select
            fullWidth
            onChange={handleChange}
            options={options}
            value={value}
          />
        }
        label={t(label)}
      />
      <Box sx={{ height: 16 }} />
    </>
  );
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

  const masterLists = generateOptions(
    masterListData?.nodes ?? [],
    list =>
      `${list.name} (${list.lines?.totalCount} ${t('label.item', {
        count: list.lines?.totalCount,
      })})`
  );

  const locations = generateOptions(
    locationData?.nodes ?? [],
    location => location.name
  );

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
                <SelectInput
                  argument="masterListId"
                  options={masterLists}
                  value={createStocktakeArgs.masterListId}
                  t={t}
                  setArgs={setCreateStocktakeArgs}
                  label="label.master-list"
                />
                <SelectInput
                  argument="locationId"
                  options={locations}
                  value={createStocktakeArgs.locationId}
                  t={t}
                  setArgs={setCreateStocktakeArgs}
                  label="label.location"
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
