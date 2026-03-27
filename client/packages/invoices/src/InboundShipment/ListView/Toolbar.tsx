import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  Box,
  FilterMenu,
  SearchBar,
  FilterRule,
  useSimplifiedTabletUI,
  FilterController,
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
  const statuses = getStatusSequence(InvoiceNodeType.InboundShipment).filter(
    status => invoiceStatusOptions?.includes(status)
  );

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
                name: t('label.delivered-datetime'),
                elements: [
                  {
                    type: 'dateTime',
                    name: t('label.from-delivered-datetime'),
                    urlParameter: 'deliveredDatetime',
                    range: 'from',
                  },
                  {
                    type: 'dateTime',
                    name: t('label.to-delivered-datetime'),
                    urlParameter: 'deliveredDatetime',
                    range: 'to',
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
