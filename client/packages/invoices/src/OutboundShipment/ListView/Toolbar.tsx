import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterController,
  Box,
  FilterMenu,
  SearchBar,
  FilterRule,
  useSimplifiedTabletUI,
  usePreferences,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { getStatusSequence } from '../../statuses';
import { getStatusTranslator } from '../../utils';

interface ToolbarProps {
  filter: FilterController;
}

export const Toolbar = ({ filter }: ToolbarProps) => {
  const t = useTranslation();
  const simplifiedTabletView = useSimplifiedTabletUI();
  const { invoiceStatusOptions } = usePreferences();
  const statuses = getStatusSequence(InvoiceNodeType.OutboundShipment).filter(
    status => invoiceStatusOptions?.includes(status)
  );

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
                type: 'number',
                name: t('label.invoice-number'),
                urlParameter: 'invoiceNumber',
                wide: true,
              },
              {
                type: 'enum',
                name: t('label.status'),
                urlParameter: 'status',
                options: statuses.map(status => ({
                  value: status,
                  label: getStatusTranslator(t)(status),
                })),
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
                    type: 'dateTime',
                    name: t('label.from-created-datetime'),
                    urlParameter: 'createdDatetime',
                    range: 'from',
                  },
                  {
                    type: 'dateTime',
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
                    type: 'dateTime',
                    name: t('label.from-shipped-datetime'),
                    urlParameter: 'shippedDatetime',
                    range: 'from',
                  },
                  {
                    type: 'dateTime',
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
