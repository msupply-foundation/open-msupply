import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  useBufferState,
  BufferedTextInput,
  PanelRow,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation();
  const { transportReference, expectedDeliveryDatetime, update } =
    useInbound.document.fields([
      'transportReference',
      'expectedDeliveryDatetime',
    ]);
  const [referenceBuffer, setReferenceBuffer] = useBufferState(
    transportReference ?? ''
  );
  const { localisedDate } = useFormatDateTime();

  // the text input is read-only, as the transport reference is only populated
  // as part of the transfer creation process,
  // it isn't possible currently for users to edit it

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
              expectedDeliveryDatetime
                ? localisedDate(expectedDeliveryDatetime)
                : ''
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
            onChange={e => {
              setReferenceBuffer(e.target.value);
              update({ transportReference: e.target.value });
            }}
            value={referenceBuffer}
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
