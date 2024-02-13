import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  useBufferState,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  const isDisabled = useOutbound.utils.isDisabled();
  const { transportReference, update } = useOutbound.document.fields([
    'transportReference',
  ]);
  const [referenceBuffer, setReferenceBuffer] = useBufferState(
    transportReference ?? ''
  );

  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
        <PanelLabel display="flex" alignItems="center">
          {t('heading.reference')}
        </PanelLabel>
        <BufferedTextInput
          disabled={isDisabled}
          onChange={e => {
            setReferenceBuffer(e.target.value);
            update({ transportReference: e.target.value });
          }}
          value={referenceBuffer}
          InputProps={{
            style: {
              backgroundColor: 'white',
            },
          }}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const TransportSection = memo(TransportSectionComponent);
