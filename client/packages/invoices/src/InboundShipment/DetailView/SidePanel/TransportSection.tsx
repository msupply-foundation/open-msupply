import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  useBufferState,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  const { transportReference, update } = useInbound.document.fields([
    'transportReference',
  ]);
  const [referenceBuffer, setReferenceBuffer] = useBufferState(
    transportReference ?? ''
  );

  // the text input is read-only, as the transport reference is only populated
  // as part of the transfer creation process,
  // it isn't possible currently for users to edit it

  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
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
