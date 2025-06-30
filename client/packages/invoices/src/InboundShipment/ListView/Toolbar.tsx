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

  const filterString =
    ((filter.filterBy?.['invoiceNumber'] as FilterRule)?.equalTo as string) ||
    '';

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
        {simplifiedTabletView ? (
          <SearchBar
            placeholder={t('placeholder.search-by', {
              field: 'invoice number',
            })}
            value={filterString}
            onChange={newValue => {
              if (!newValue) {
                return filter.onClearFilterRule('invoiceNumber');
              }
              return filter.onChangeStringFilterRule(
                'invoiceNumber',
                'equalTo',
                newValue
              );
            }}
          />
        ) : (
          <FilterMenu
            filters={[
              {
                type: 'text',
                name: t('label.name'),
                urlParameter: 'otherPartyName',
                placeholder: t('placeholder.search-by-name'),
              },
              {
                type: 'group',
                name: t('label.created-datetime'),
                elements: [
                  {
                    type: 'dateTime',
                    displayAs: 'date',
                    name: t('label.from-created-datetime'),
                    urlParameter: 'createdDatetime',
                    range: 'from',
                  },
                  {
                    type: 'dateTime',
                    displayAs: 'date',
                    name: t('label.to-created-datetime'),
                    urlParameter: 'createdDatetime',
                    range: 'to',
                  },
                ],
              },
              {
                type: 'enum',
                name: t('label.status'),
                urlParameter: 'status',
                options: [
                  { label: t('label.new'), value: InvoiceNodeStatus.New },
                  {
                    label: t('label.shipped'),
                    value: InvoiceNodeStatus.Shipped,
                  },
                  {
                    label: t('label.received'),
                    value: InvoiceNodeStatus.Received,
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
            ]}
          />
        )}
      </Box>
    </AppBarContentPortal>
  );
};
