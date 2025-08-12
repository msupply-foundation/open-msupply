import React, { useMemo } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  useFormatCurrency,
  PanelField,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../../api';

interface PriceSectionProps {
  lines: PurchaseOrderLineFragment[];
}

export const PriceSection = ({ lines }: PriceSectionProps) => {
  const t = useTranslation();
  const c = useFormatCurrency();

  const [totalPrice, totalAfterDiscount] = useMemo(
    () =>
      lines.reduce(
        ([fullPrice, afterDiscount], line) => {
          const {
            pricePerUnitBeforeDiscount,
            pricePerUnitAfterDiscount,
            requestedNumberOfUnits,
            requestedPackSize,
            authorisedNumberOfUnits,
          } = line;
          const numUnits = authorisedNumberOfUnits ?? requestedNumberOfUnits;
          const linePriceBeforeDiscount =
            pricePerUnitBeforeDiscount * numUnits * requestedPackSize;
          const linePriceAfterDiscount =
            pricePerUnitAfterDiscount * numUnits * requestedPackSize;
          return [
            fullPrice + (linePriceBeforeDiscount ?? 0),
            afterDiscount + (linePriceAfterDiscount ?? 0),
          ];
        },
        [0, 0]
      ),
    [lines]
  );

  return (
    <DetailPanelSection title={t('title.pricing')}>
      <Grid container gap={1} key="other-section">
        <PanelRow>
          <PanelLabel>{t('label.price-total')}</PanelLabel>
          <PanelField>{c(totalPrice)}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.price-total-after-discount')}</PanelLabel>
          <PanelField>{c(totalAfterDiscount)}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
