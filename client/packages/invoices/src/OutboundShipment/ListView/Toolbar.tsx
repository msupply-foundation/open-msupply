import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterController,
  Box,
  FilterMenu,
  InvoiceNodeStatus,
  SearchBar,
  FilterRule,
} from '@openmsupply-client/common';

interface ToolbarProps {
  filter: FilterController;
  simplifiedTabletView?: boolean;
}

export const Toolbar = ({ filter, simplifiedTabletView }: ToolbarProps) => {
  const t = useTranslation();
  const key = 'invoiceNumber';
  const filterString =
    ((filter.filterBy?.[key] as FilterRule)?.equalTo as string) || '';

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" gap={1}>
        {!simplifiedTabletView ? (
          <FilterMenu
            filters={[
              {
                type: 'text',
                name: t('label.name'),
                urlParameter: 'otherPartyName',
                placeholder: t('placeholder.search-by-name'),
              },
              {
                type: 'enum',
                name: t('label.status'),
                urlParameter: 'status',
                options: [
                  { label: t('label.new'), value: InvoiceNodeStatus.New },
                  {
                    label: t('label.allocated'),
                    value: InvoiceNodeStatus.Allocated,
                  },
                  { label: t('label.picked'), value: InvoiceNodeStatus.Picked },
                  {
                    label: t('label.shipped'),
                    value: InvoiceNodeStatus.Shipped,
                  },
                  {
                    label: t('label.delivered'),
                    value: InvoiceNodeStatus.Delivered,
                  },
                  {
                    label: t('label.verified'),
                    value: InvoiceNodeStatus.Verified,
                  },
                ],
              },
              {
                type: 'text',
                name: t('label.reference'),
                urlParameter: 'theirReference',
              },
              {
                type: 'group',
                name: t('label.created-datetime'),
                elements: [
                  {
                    type: 'date',
                    name: t('label.from-created-datetime'),
                    urlParameter: 'createdDatetime',
                    range: 'from',
                  },
                  {
                    type: 'date',
                    name: t('label.to-created-datetime'),
                    urlParameter: 'createdDatetime',
                    range: 'to',
                  },
                ],
              },
              {
                type: 'group',
                name: t('label.shipped-datetime'),
                elements: [
                  {
                    type: 'date',
                    name: t('label.from-shipped-datetime'),
                    urlParameter: 'shippedDatetime',
                    range: 'from',
                  },
                  {
                    type: 'date',
                    name: t('label.to-shipped-datetime'),
                    urlParameter: 'shippedDatetime',
                    range: 'to',
                  },
                ],
              },
            ]}
          />
        ) : (
          <SearchBar
            placeholder={t('placeholder.search-by-invoice-number')}
            value={filterString}
            onChange={newValue => {
              filter.onChangeStringFilterRule(
                'invoiceNumber',
                'equalTo',
                newValue
              );
            }}
          />
        )}
      </Box>
    </AppBarContentPortal>
  );
};
