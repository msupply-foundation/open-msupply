import React, { SyntheticEvent } from 'react';
import {
  createQueryParamsStore,
  ListSearch,
  QueryParamsProvider,
  useTranslation,
  DefaultAutocompleteItemOption,
  AutocompleteOptionRenderer,
  Typography,
  Box,
  FilterOptionsState,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment, usePurchaseOrder } from '../../api';

interface PurchaseOrderLineSearchModalProps {
  purchaseOrderId: string;
  open: boolean;
  onClose: () => void;
  onChange: (purchaseOrderLine: PurchaseOrderLineFragment) => void;
}

const PurchaseOrderSearchComponent = ({
  purchaseOrderId,
  open,
  onClose,
  onChange,
}: PurchaseOrderLineSearchModalProps) => {
  const t = useTranslation();
  const {
    query: { data, isFetching },
  } = usePurchaseOrder(purchaseOrderId);

  const filterOptions = (
    options: PurchaseOrderLineFragment[],
    { inputValue }: FilterOptionsState<PurchaseOrderLineFragment>
  ) => {
    const filter = inputValue.toLowerCase();
    return options.filter(
      option =>
        option.lineNumber.toString().includes(filter) ||
        option.item.name.includes(filter) ||
        option.comment?.toLowerCase().includes(filter)
    );
  };

  const handleChange = (
    _event: SyntheticEvent,
    purchaseOrder:
      | PurchaseOrderLineFragment
      | PurchaseOrderLineFragment[]
      | null
  ) => {
    if (purchaseOrder && !(purchaseOrder instanceof Array))
      onChange(purchaseOrder);
  };

  const getPurchaseOrderLineOptionRenderer: AutocompleteOptionRenderer<
    PurchaseOrderLineFragment
  > = (props, line) => (
    <DefaultAutocompleteItemOption {...props} key={line.id}>
      <Box display="flex" flexDirection="column" gap={0.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography>
            {t('label.purchase-order-shorthand')} #{line.lineNumber}
          </Typography>
          <Typography>{line.item.name ?? ''}</Typography>
          <Typography variant="body2" color="textSecondary">
            {line.item.code || ''}
          </Typography>
        </Box>
        {line.comment && (
          <Typography variant="body2" color="textSecondary">
            {line.comment}
          </Typography>
        )}
      </Box>
    </DefaultAutocompleteItemOption>
  );

  return (
    <ListSearch
      loading={isFetching}
      open={open}
      options={data?.lines.nodes ?? []}
      onClose={onClose}
      title={t('label.purchase-order-lines')}
      renderOption={getPurchaseOrderLineOptionRenderer}
      getOptionLabel={(option: PurchaseOrderLineFragment) =>
        `${option.item.name || ''} - ${option.lineNumber}`
      }
      filterOptions={filterOptions}
      onChange={handleChange}
    />
  );
};

export const PurchaseOrderLineSearchModal = (
  props: PurchaseOrderLineSearchModalProps
) => (
  <QueryParamsProvider
    createStore={createQueryParamsStore<PurchaseOrderLineFragment>({
      initialSortBy: { key: 'number' },
    })}
  >
    <PurchaseOrderSearchComponent {...props} />
  </QueryParamsProvider>
);
