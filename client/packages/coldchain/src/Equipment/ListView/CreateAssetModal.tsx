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
  InsertAssetInput,
  BasicTextInput,
} from '@openmsupply-client/common';
import {
  AssetCatalogueItemFragment,
  mapIdNameToOptions,
  useAssetData,
} from '@openmsupply-client/system';
import { useAssets } from '../api';
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
  code: '',
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
    message.includes('asset_code_key') &&
    message.includes('duplicate key')
  ) {
    return 'error.cce-code-already-used';
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
  const [draft, setDraft] = useState<InsertAssetInput>(getEmptyAsset());
  const { data: categoryData, isLoading: isLoadingCategories } =
    useAssetData.utils.categories({ classId: { equalTo: CCE_CLASS_ID } });
  const { data: catalogueItemData } = useAssetData.document.list(categoryId);
  const { mutateAsync: save } = useAssets.document.insert();

  const handleClose = () => {
    setCategoryId('');
    setDraft(getEmptyAsset());
    onClose();
  };

  const updateDraft = (patch: Partial<InsertAssetInput>) => {
    setDraft({ ...draft, ...patch });
  };

  const catalogueItems = catalogueItemData?.nodes ?? [];
  const selectedCatalogueItem = catalogueItems.find(
    ci => ci.id === draft.catalogueItemId
  );
  return (
    <Modal
      title={t('heading.add-cold-chain-equipment')}
      width={700}
      height={100}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!draft.catalogueItemId || !draft.code}
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
            label={t('label.code')}
            Input={
              <BasicTextInput
                fullWidth
                value={draft.code}
                onChange={e => updateDraft({ code: e.target.value })}
              />
            }
          />
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
