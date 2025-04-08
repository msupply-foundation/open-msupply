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

export const TransportSectionComponent: FC = () => {
  const t = useTranslation();
  const { transportReference, expectedDeliveryDate } =
    useInbound.document.fields(['transportReference', 'expectedDeliveryDate']);
  const { localisedDate } = useFormatDateTime();

  // Both transportReference and expectedDeliveryDatetime are read-only and are
  // created during the Inbound Shipment transfer process.
  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
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
