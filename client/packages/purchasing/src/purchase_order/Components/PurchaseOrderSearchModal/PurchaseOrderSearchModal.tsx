import React, { FC } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
  useUrlQueryParams,
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
  FilterOptionsState,
} from '@openmsupply-client/common';
import { usePurchaseOrderList, PurchaseOrderRowFragment } from '../../api';

interface PurchaseOrderSearchModalProps {
  open: boolean;
  onClose: () => void;
  onChange: (purchaseOrder: PurchaseOrderRowFragment) => void;
}

const PurchaseOrderSearchComponent: FC<PurchaseOrderSearchModalProps> = ({
  open,
  onClose,
  onChange,
}) => {
  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'number', dir: 'desc' },
  });

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };

  const {
    query: { data, isFetching },
  } = usePurchaseOrderList(listParams);
  const t = useTranslation();

  const filterOptions = (
    options: PurchaseOrderRowFragment[],
    { inputValue }: FilterOptionsState<PurchaseOrderRowFragment>
  ) => {
    const filter = inputValue.toLowerCase();
    return options.filter(
      option =>
        option.supplier?.name?.toLowerCase().includes(filter) ||
        option.number.toString().includes(filter) ||
        option.comment?.toLowerCase().includes(filter)
    );
  };

  const getPurchaseOrderOptionRenderer: AutocompleteOptionRenderer<
    PurchaseOrderRowFragment
  > = (props, po) => (
    <DefaultAutocompleteItemOption {...props} key={po.id}>
      <Box display="flex" flexDirection="column" gap={0.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography>
            {t('label.purchase-order-shorthand')} #{po.number}
          </Typography>
          <Typography>{po.supplier?.name ?? ''}</Typography>

          <Typography variant="body2" color="textSecondary">
            {po.reference || ''}
          </Typography>
        </Box>
        {po.comment && (
          <Typography variant="body2" color="textSecondary">
            {po.comment}
          </Typography>
        )}
      </Box>
    </DefaultAutocompleteItemOption>
  );

  return (
    <ListSearch
      loading={isFetching}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('label.purchase-orders')}
      renderOption={getPurchaseOrderOptionRenderer}
      getOptionLabel={(option: PurchaseOrderRowFragment) =>
        `${option.supplier?.name || ''} - ${option.number}`
      }
      filterOptions={filterOptions}
      onChange={(
        _,
        purchaseOrder:
          | PurchaseOrderRowFragment
          | PurchaseOrderRowFragment[]
          | null
      ) => {
        if (purchaseOrder && !(purchaseOrder instanceof Array)) {
          onChange(purchaseOrder);
        }
      }}
    />
  );
};

export const PurchaseOrderSearchModal: FC<
  PurchaseOrderSearchModalProps
> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<PurchaseOrderRowFragment>({
      initialSortBy: { key: 'number' },
    })}
  >
    <PurchaseOrderSearchComponent {...props} />
  </QueryParamsProvider>
);
