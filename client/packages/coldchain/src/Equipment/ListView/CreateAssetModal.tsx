import React, { useState } from 'react';
import {
  BasicSpinner,
  useNotification,
  Box,
  useDialog,
  useTranslation,
  DialogButton,
  InputWithLabelRow,
  Select,
  Autocomplete,
  FnUtils,
  BasicTextInput,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import {
  AssetCatalogueItemFragment,
  StoreRowFragment,
  StoreSearchInput,
  mapIdNameToOptions,
  useAssetData,
} from '@openmsupply-client/system';
import { AssetFragment, useAssets } from '../api';
import { CCE_CLASS_ID } from '../utils';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mapCatalogueItem = (catalogueItem: AssetCatalogueItemFragment) => ({
  label: `${catalogueItem.code} ${catalogueItem.assetType?.name} ${catalogueItem.manufacturer} ${catalogueItem.model}`,
  value: catalogueItem.id,
});

const mapCatalogueItems = (catalogueItems: AssetCatalogueItemFragment[]) =>
  catalogueItems.map(mapCatalogueItem);

const getEmptyAsset = () => ({
  id: FnUtils.generateUUID(),
  assetNumber: '',
  catalogueItemId: '',
});

const InputRow = ({
  label,
  Input,
}: {
  label: string;
  Input: React.ReactNode;
}) => (
  <InputWithLabelRow
    labelWidth="150"
    sx={{ marginTop: 2 }}
    label={label}
    Input={Input}
  />
);

const parseInsertError = (e: unknown) => {
  const message = (e as Error).message;
  if (
    message.includes('DatabaseError(') &&
    message.includes('UniqueViolation(') &&
    message.includes('asset_asset_number_key') &&
    message.includes('duplicate key')
  ) {
    return 'error.cce-asset-number-already-used';
  }

  return 'error.unable-to-create-cce';
};

export const CreateAssetModal = ({
  isOpen,
  onClose,
}: CreateAssetModalProps) => {
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const [categoryId, setCategoryId] = useState('');
  const [draft, setDraft] = useState<Partial<AssetFragment>>(getEmptyAsset());
  const { data: categoryData, isLoading: isLoadingCategories } =
    useAssetData.utils.categories({ classId: { equalTo: CCE_CLASS_ID } });
  const { data: catalogueItemData } = useAssetData.document.list(categoryId);
  const { mutateAsync: save } = useAssets.document.insert();
  const isCentralServer = useIsCentralServerApi();

  const handleClose = () => {
    setCategoryId('');
    setDraft(getEmptyAsset());
    onClose();
  };

  const updateDraft = (patch: Partial<AssetFragment>) => {
    setDraft({ ...draft, ...patch });
  };

  const catalogueItems = catalogueItemData?.nodes ?? [];
  const selectedCatalogueItem = catalogueItems.find(
    ci => ci.id === draft.catalogueItemId
  );

  const onStoreChange = (store: StoreRowFragment) => {
    updateDraft({
      store: {
        __typename: 'StoreNode',
        id: store.id,
        code: store.code ?? '',
        storeName: '',
      },
    });
  };

  const onStoreInputChange = (
    _event: React.SyntheticEvent<Element, Event>,
    _value: string,
    reason: string
  ) => {
    if (reason === 'clear') updateDraft({ store: null });
  };

  return (
    <Modal
      title={t('heading.add-cold-chain-equipment')}
      width={700}
      height={100}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!draft.catalogueItemId || !draft.assetNumber}
          onClick={async () => {
            try {
              await save(draft);
              success(t('messages.cce-created'))();
              handleClose();
            } catch (e) {
              error(t(parseInsertError(e)))();
            }
          }}
        />
      }
    >
      {isLoadingCategories ? (
        <BasicSpinner messageKey="loading" />
      ) : (
        <Box>
          <InputRow
            label={t('label.category')}
            Input={
              <Select
                options={mapIdNameToOptions(categoryData?.nodes ?? [])}
                fullWidth
                onChange={e => {
                  updateDraft({ catalogueItemId: '' });
                  setCategoryId(e.target.value);
                }}
                value={categoryId}
              />
            }
          />
          <InputRow
            label={t('label.catalogue-item')}
            Input={
              <Autocomplete
                value={
                  !!selectedCatalogueItem
                    ? mapCatalogueItem(selectedCatalogueItem)
                    : null
                }
                isOptionEqualToValue={option =>
                  option.value === selectedCatalogueItem?.id
                }
                options={mapCatalogueItems(catalogueItems)}
                width="100%"
                sx={{ width: '100%' }}
                onChange={(_event, selected) =>
                  updateDraft({ catalogueItemId: selected?.value ?? '' })
                }
              />
            }
          />
          <InputRow
            label={t('label.asset-number')}
            Input={
              <BasicTextInput
                fullWidth
                value={draft.assetNumber}
                onChange={e => updateDraft({ assetNumber: e.target.value })}
              />
            }
          />
          {isCentralServer && (
            <InputRow
              label={t('label.store')}
              Input={
                <StoreSearchInput
                  clearable
                  fullWidth
                  value={draft.store ?? undefined}
                  onChange={onStoreChange}
                  onInputChange={onStoreInputChange}
                />
              }
            />
          )}
          <InputRow
            label={t('label.notes')}
            Input={
              <BasicTextInput
                fullWidth
                value={draft.notes}
                onChange={e => updateDraft({ notes: e.target.value })}
                multiline
                rows={2}
              />
            }
          />
        </Box>
      )}
    </Modal>
  );
};
