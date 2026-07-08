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
  buildCustomFieldFilterDefinitions,
  InvoiceTypeInput,
} from '@openmsupply-client/common';
import { getStatusSequence } from '../../statuses';
import { getStatusTranslator } from '../../utils';
import { useInvoiceCustomFields } from '../../common';

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
  const { data: properties } = useInvoiceCustomFields(
    InvoiceNodeType.InboundShipment
  );

  const filterString =
    ((filter.filterBy?.['invoiceNumberOrStatus'] as FilterRule)
      ?.like as string) || '';

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
            placeholder={t('placeholder.search-by-invoice-number-or-status')}
            width="320px"
            value={filterString}
            onChange={newValue => {
              if (!newValue) {
                return filter.onClearFilterRule('invoiceNumberOrStatus');
              }
              return filter.onChangeStringFilterRule(
                'invoiceNumberOrStatus',
                'like',
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
                isMultiSelect: true,
                options: statuses.map(status => ({
                  value: status,
                  label: getStatusTranslator(t)(status),
                })),
              },
              {
                type: 'enum',
                name: t('label.type'),
                urlParameter: 'type',
                options: [
                  {
                    value: InvoiceTypeInput.InboundShipment,
                    label: t('label.internal'),
                  },
                  {
                    value: InvoiceTypeInput.InboundShipmentExternal,
                    label: t('label.external'),
                  },
                ],
              },
              {
                type: 'text',
                name: t('label.reference'),
                urlParameter: 'theirReference',
              },
              {
                type: 'number',
                name: t('label.linked-order-number'),
                urlParameter: 'linkedOrderNumber',
                wide: true,
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
              ...buildCustomFieldFilterDefinitions(properties ?? [], {
                min: t('label.min'),
                max: t('label.max'),
                fromDate: t('label.from-date'),
                toDate: t('label.to-date'),
              }),
            ]}
          />
        )}
      </Box>
    </AppBarContentPortal>
  );
};
