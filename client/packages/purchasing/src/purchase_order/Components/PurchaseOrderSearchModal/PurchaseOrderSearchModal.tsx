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
    query: { data, isLoading },
  } = usePurchaseOrderList(listParams);
  const t = useTranslation();

  const getPurchaseOrderOptionRenderer: AutocompleteOptionRenderer<PurchaseOrderRowFragment> = 
    (props, item) => (
      <DefaultAutocompleteItemOption {...props} key={item.id}>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography sx={{ fontWeight: 'bold' }}>
              {item.supplier?.name || 'Unknown Supplier'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              PO #{item.number}
            </Typography>
          </Box>
          {item.comment && (
            <Typography variant="body2" color="textSecondary">
              {item.comment}
            </Typography>
          )}
        </Box>
      </DefaultAutocompleteItemOption>
    );

  return (
    <ListSearch
      loading={isLoading}
      open={open}
      options={data?.nodes ?? []}
      onClose={onClose}
      title={t('label.purchase-orders')}
      renderOption={getPurchaseOrderOptionRenderer}
      getOptionLabel={(option: PurchaseOrderRowFragment) => 
        `${option.supplier?.name || ''} - PO ${option.number}`
      }
      filterOptions={(options, { inputValue }) => {
        const filter = inputValue.toLowerCase();
        return options.filter(option => 
          option.supplier?.name?.toLowerCase().includes(filter) ||
          option.number.toString().includes(filter) ||
          option.comment?.toLowerCase().includes(filter)
        );
      }}
      onChange={(_, purchaseOrder: PurchaseOrderRowFragment | PurchaseOrderRowFragment[] | null) => {
        if (purchaseOrder && !(purchaseOrder instanceof Array)) {
          onChange(purchaseOrder);
        }
      }}
    />
  );
};

export const PurchaseOrderSearchModal: FC<PurchaseOrderSearchModalProps> = props => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<PurchaseOrderRowFragment>({
      initialSortBy: { key: 'number' },
    })}
  >
    <PurchaseOrderSearchComponent {...props} />
  </QueryParamsProvider>
);
