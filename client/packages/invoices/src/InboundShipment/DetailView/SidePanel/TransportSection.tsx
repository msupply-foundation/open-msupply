import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  BufferedTextInput,
  PanelRow,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { ShippingMethodSearchInput } from '@openmsupply-client/system';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation();
  const { transportReference, expectedDeliveryDate, shippingMethod } =
    useInbound.document.fields([
      'transportReference',
      'expectedDeliveryDate',
      'shippingMethod',
    ]);
  const { localisedDate } = useFormatDateTime();

  // Both transportReference and expectedDeliveryDatetime are read-only and are
  // created during the Inbound Shipment transfer process.
  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
        <PanelRow>
          <PanelLabel>{t('label.shipping-method')}</PanelLabel>
          <ShippingMethodSearchInput
            value={shippingMethod}
            onChange={() => {}}
            width={250}
            disabled={true}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel display="flex" alignItems="center">
            {t('label.expected-delivery-date')}
          </PanelLabel>
          <BufferedTextInput
            disabled={true}
            value={
              expectedDeliveryDate ? localisedDate(expectedDeliveryDate) : ''
            }
            slotProps={{
              input: {
                style: {
                  backgroundColor: 'white',
                },
              },
            }}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel display="flex" alignItems="center">
            {t('heading.reference')}
          </PanelLabel>
          <BufferedTextInput
            disabled={true}
            value={transportReference}
            slotProps={{
              input: {
                style: {
                  backgroundColor: 'white',
                },
              },
            }}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const TransportSection = memo(TransportSectionComponent);
