import React, { useEffect, useState } from 'react';
import {
  BasicSpinner,
  useNotification,
  Box,
  useDialog,
  useTranslation,
  DialogButton,
  InputWithLabelRow,
  Select,
  FnUtils,
  BasicTextInput,
  useIsCentralServerApi,
  Switch,
  AutocompleteWithPagination,
  usePagination,
  useStringFilter,
  ArrayUtils,
  useDebounceCallback,
  AssetLogStatusInput,
} from '@openmsupply-client/common';
import {
  AssetCatalogueItemFragment,
  StoreRowFragment,
  StoreSearchInput,
  mapIdNameToOptions,
  useAssetData,
} from '@openmsupply-client/system';
import { useAssets } from '../api';
import { CCE_CLASS_ID } from '../utils';
import { InsertAsset } from '../api/api';

const DEBOUNCE_TIMEOUT = 300;
const RECORDS_PER_PAGE = 100;

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mapCatalogueItem = (catalogueItem: AssetCatalogueItemFragment) => ({
  label: `${catalogueItem.code} ${catalogueItem.assetType?.name} ${catalogueItem.manufacturer} ${catalogueItem.model}`,
  value: catalogueItem.id,
  id: catalogueItem.id,
});

const mapCatalogueItems = (catalogueItems: AssetCatalogueItemFragment[]) =>
  catalogueItems.map(mapCatalogueItem);

const getEmptyAsset = () => ({
  id: FnUtils.generateUUID(),
  assetNumber: '',
  classId: CCE_CLASS_ID,
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
  if (message.includes('AssetNumberAlreadyExists')) {
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
  const [isCatalogueAsset, setIsCatalogueAsset] = useState(true);
  const [draft, setDraft] = useState<Partial<InsertAsset>>(getEmptyAsset());
  const { data: categoryData, isLoading: isLoadingCategories } =
    useAssetData.utils.categories({ classId: { equalTo: CCE_CLASS_ID } });
  const { data: typeData, isLoading: isLoadingTypes } =
    useAssetData.utils.types({
      categoryId: { equalTo: draft.categoryId ?? '' },
    });
  const { pagination, onPageChange } = usePagination(RECORDS_PER_PAGE);
  const { filter, onFilter } = useStringFilter('search');
  const {
    data: catalogueItemData,
    isFetching,
    fetchNextPage,
  } = useAssetData.document.infiniteList({
    filter,
    categoryId: draft.categoryId,
    pagination,
  });

  const { mutateAsync: save } = useAssets.document.insert();
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const isCentralServer = useIsCentralServerApi();

  const handleClose = () => {
    setDraft(getEmptyAsset());
    onClose();
  };

  const updateDraft = (patch: Partial<InsertAsset>) => {
    setDraft({ ...draft, ...patch });
  };

  const catalogueItems = ArrayUtils.flatMap(
    catalogueItemData?.pages,
    page => page?.nodes ?? []
  );

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
  const isDisabled =
    !draft.assetNumber ||
    (isCatalogueAsset ? !draft.catalogueItemId : !draft.typeId);

  const debounceOnFilter = useDebounceCallback(
    (searchText: string) => {
      onPageChange(0); // Reset pagination when searching for a new item
      onFilter(searchText);
    },
    [onFilter],
    DEBOUNCE_TIMEOUT
  );

  const onSave = async () => {
    try {
      await save(draft);
      await insertLog({
        id: FnUtils.generateUUID(),
        assetId: draft.id,
        comment: t('label.created'),
        status: AssetLogStatusInput.Functioning,
      });
      invalidateQueries();
      success(t('messages.cce-created'))();
      handleClose();
    } catch (e) {
      error(t(parseInsertError(e)))();
    }
  };

  // when the pagination changes, fetch the next page
  useEffect(() => {
    fetchNextPage({ pageParam: pagination.page });
  }, [fetchNextPage, pagination.page]);

  // reset the catalogue item pagination when the category changes
  useEffect(() => {
    onPageChange(0);
  }, [draft.categoryId, onPageChange]);

  return (
    <Modal
      title={t('heading.add-cold-chain-equipment')}
      width={700}
      height={100}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
      okButton={
        <DialogButton variant="ok" disabled={isDisabled} onClick={onSave} />
      }
    >
      {isLoadingCategories ? (
        <BasicSpinner messageKey="loading" />
      ) : (
        <Box>
          <Box display="flex" justifyContent="flex-end">
            <Switch
              onChange={() => setIsCatalogueAsset(!isCatalogueAsset)}
              checked={isCatalogueAsset}
              label={t('label.use-catalogue')}
            />
          </Box>
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
            label={t('label.category')}
            Input={
              <Select
                options={mapIdNameToOptions(categoryData?.nodes ?? [])}
                fullWidth
                onChange={e => {
                  updateDraft({
                    catalogueItemId: undefined,
                    categoryId: e.target.value,
                    typeId: '',
                  });
                }}
                value={draft.categoryId ?? ''}
              />
            }
          />
          {isCatalogueAsset ? (
            <InputRow
              label={t('label.catalogue-item')}
              Input={
                <AutocompleteWithPagination
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
                  pagination={{
                    ...pagination,
                    total: catalogueItemData?.pages?.[0]?.totalCount ?? 0,
                  }}
                  paginationDebounce={DEBOUNCE_TIMEOUT}
                  onPageChange={onPageChange}
                  loading={isFetching}
                  onInputChange={(reason, value) => {
                    if (reason?.type === 'change') debounceOnFilter(value);
                  }}
                />
              }
            />
          ) : (
            <InputRow
              label={t('label.type')}
              Input={
                <Select
                  options={
                    isLoadingTypes
                      ? []
                      : mapIdNameToOptions(typeData?.nodes ?? [])
                  }
                  fullWidth
                  onChange={e => {
                    updateDraft({
                      typeId: e.target.value,
                    });
                  }}
                  value={draft.typeId}
                />
              }
            />
          )}
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
