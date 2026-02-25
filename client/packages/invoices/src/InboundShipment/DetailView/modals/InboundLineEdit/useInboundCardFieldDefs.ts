import { useMemo } from 'react';
import {
  useTranslation,
  CardFieldDef,
  BasicTextInput,
  NumericTextInput,
  CurrencyInput,
  ExpiryDateInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import { PatchDraftLineInput } from '../../../api';
import React from 'react';

interface UseInboundCardFieldDefsProps {
  updateDraftLine: (patch: PatchDraftLineInput) => void;
  isDisabled: boolean;
}

export const useInboundCardFieldDefs = ({
  updateDraftLine,
  isDisabled,
}: UseInboundCardFieldDefsProps): CardFieldDef<DraftInboundLine>[] => {
  const t = useTranslation();

  return useMemo(() => {
    const fields: CardFieldDef<DraftInboundLine>[] = [
      // --- Quantities section ---
      {
        key: 'batch',
        label: t('label.batch'),
        section: t('label.quantities'),
        Cell: ({ rowData }) =>
          React.createElement(BasicTextInput, {
            disabled: isDisabled,
            value: rowData.batch ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              updateDraftLine({ id: rowData.id, batch: e.target.value }),
            fullWidth: true,
          }),
      },
      {
        key: 'expiryDate',
        label: t('label.expiry-date'),
        section: t('label.quantities'),
        Cell: ({ rowData }) =>
          React.createElement(ExpiryDateInput, {
            value: DateUtils.getDateOrNull(rowData.expiryDate),
            disabled: isDisabled,
            onChange: (date: Date | null) =>
              updateDraftLine({
                id: rowData.id,
                expiryDate: date ? Formatter.naiveDate(date) : undefined,
              }),
          }),
      },
      {
        key: 'packSize',
        label: t('label.received-pack-size'),
        section: t('label.quantities'),
        Cell: ({ rowData }) =>
          React.createElement(NumericTextInput, {
            value: rowData.packSize,
            disabled: isDisabled,
            onChange: (value: number | undefined) =>
              updateDraftLine({ id: rowData.id, packSize: value ?? 1 }),
            min: 1,
            fullWidth: true,
          }),
      },
      {
        key: 'numberOfPacks',
        label: t('label.packs-received'),
        section: t('label.quantities'),
        Cell: ({ rowData }) =>
          React.createElement(NumericTextInput, {
            value: rowData.numberOfPacks,
            disabled: isDisabled,
            onChange: (value: number | undefined) =>
              updateDraftLine({ id: rowData.id, numberOfPacks: value ?? 0 }),
            min: 0,
            fullWidth: true,
          }),
      },
      // --- Pricing section ---
      {
        key: 'costPricePerPack',
        label: t('label.pack-cost-price'),
        section: t('label.pricing'),
        Cell: ({ rowData }) =>
          React.createElement(CurrencyInput, {
            value: rowData.costPricePerPack,
            disabled: isDisabled,
            onChangeNumber: (value: number) =>
              updateDraftLine({ id: rowData.id, costPricePerPack: value }),
            width: '100%',
          }),
      },
      {
        key: 'sellPricePerPack',
        label: t('label.pack-sell-price'),
        section: t('label.pricing'),
        Cell: ({ rowData }) =>
          React.createElement(CurrencyInput, {
            value: rowData.sellPricePerPack,
            disabled: isDisabled,
            onChangeNumber: (value: number) =>
              updateDraftLine({ id: rowData.id, sellPricePerPack: value }),
            width: '100%',
          }),
      },
      // --- Other section ---
      {
        key: 'note',
        label: t('label.stocktake-comment'),
        section: t('heading.other'),
        span: 2,
        Cell: ({ rowData }) =>
          React.createElement(BasicTextInput, {
            disabled: isDisabled,
            value: rowData.note ?? '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              updateDraftLine({ id: rowData.id, note: e.target.value }),
            fullWidth: true,
          }),
      },
    ];

    return fields;
  }, [t, updateDraftLine, isDisabled]);
};
