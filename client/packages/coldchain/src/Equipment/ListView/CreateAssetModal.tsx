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
} from '@openmsupply-client/common';
import {
  AssetCatalogueItemFragment,
  mapIdNameToOptions,
  useAssetData,
} from '@openmsupply-client/system';
import { useAssets } from '../api';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mapCatalogueItems = (catalogueItems: AssetCatalogueItemFragment[]) =>
  catalogueItems.map(item => ({
    label: `${item.code} Type Manufacturer Model`,
    value: item.id,
  }));

export const CreateAssetModal = ({
  isOpen,
  onClose,
}: CreateAssetModalProps) => {
  const t = useTranslation('coldchain');
  const { error, success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });
  const [categoryId, setCategoryId] = useState('');
  const [catalogueItemId, setCatalogueItemId] = useState('');
  const { data: categoryData, isLoading: isLoadingCategories } =
    useAssetData.utils.categories();
  const { data: catalogueItems } = useAssetData.document.list(categoryId);
  const { mutateAsync: save } = useAssets.document.insert();

  const handleClose = () => {
    setCategoryId('');
    setCatalogueItemId('');
    onClose();
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
          disabled={!catalogueItemId || !categoryId}
          onClick={async () => {
            try {
              await save({
                id: FnUtils.generateUUID(),
                name: 'test',
                code: '000000000',
                catalogueItemId,
              });
              success(t('message.cce-created'))();
              handleClose();
            } catch (e) {
              error(t('error.unable-to-create-cce'))();
            }
          }}
        />
      }
    >
      {isLoadingCategories ? (
        <BasicSpinner messageKey="loading" />
      ) : (
        <Box>
          <InputWithLabelRow
            labelWidth="150"
            label={t('label.category')}
            Input={
              <Select
                options={mapIdNameToOptions(categoryData?.nodes ?? [])}
                fullWidth
                onChange={e => setCategoryId(e.target.value)}
              />
            }
          />
          <InputWithLabelRow
            labelWidth="150"
            sx={{ marginTop: 2 }}
            label={t('label.catalogue-item')}
            Input={
              <Autocomplete
                options={mapCatalogueItems(catalogueItems?.nodes ?? [])}
                width="100%"
                sx={{ width: '100%' }}
                onChange={(_event, selected) =>
                  setCatalogueItemId(selected?.value ?? '')
                }
              />
            }
          />
        </Box>
      )}
    </Modal>
  );
};
