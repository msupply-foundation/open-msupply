import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  useBufferState,
  BufferedTextInput,
  PanelRow,
  DateTimePickerInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation();
  const isDisabled = useOutbound.utils.isDisabled();
  const { transportReference, expectedDeliveryDatetime, update } =
    useOutbound.document.fields([
      'transportReference',
      'expectedDeliveryDatetime',
    ]);
  const [referenceBuffer, setReferenceBuffer] = useBufferState(
    transportReference ?? ''
  );

  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
        <PanelRow>
          <PanelLabel>{t('label.expected-delivery-date')}</PanelLabel>
          <DateTimePickerInput
            disabled={isDisabled}
            value={DateUtils.getDateOrNull(expectedDeliveryDatetime)}
            format="P"
            onChange={expectedDeliveryDatetime => {
              const formattedDate = expectedDeliveryDatetime
                ? Formatter.toIsoString(
                    DateUtils.endOfDayOrNull(expectedDeliveryDatetime)
                  )?.replace(/Z$/, '')
                : null;
              update({ expectedDeliveryDatetime: formattedDate });
            }}
            sx={{
              flex: 2,
            }}
            textFieldProps={{
              InputProps: {
                style: {
                  backgroundColor: 'white',
                  width: 170,
                },
              },
            }}
            actions={['cancel', 'accept']}
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('heading.reference')}</PanelLabel>
          <BufferedTextInput
            disabled={isDisabled}
            onChange={e => {
              setReferenceBuffer(e.target.value);
              update({ transportReference: e.target.value });
            }}
            value={referenceBuffer}
            slotProps={{
              input: {
                style: {
                  backgroundColor: 'white',
                  width: 170,
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
