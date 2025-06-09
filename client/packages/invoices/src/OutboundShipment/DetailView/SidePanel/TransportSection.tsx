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
  const { transportReference, expectedDeliveryDate, update } =
    useOutbound.document.fields(['transportReference', 'expectedDeliveryDate']);
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
            value={DateUtils.getDateOrNull(expectedDeliveryDate)}
            format="P"
            onChange={expectedDeliveryDate => {
              const formattedDate = expectedDeliveryDate
                ? Formatter.naiveDate(expectedDeliveryDate)
                : null;
              update({
                expectedDeliveryDate: formattedDate,
              });
            }}
            sx={{
              flex: 2,
            }}
            textFieldSx={{
              backgroundColor: 'white',
              width: 170,
            }}
            actions={['cancel', 'accept', 'clear']}
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
