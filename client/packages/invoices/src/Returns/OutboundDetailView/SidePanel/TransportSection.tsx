import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  useBufferState,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  // const isDisabled = useReturns.utils.outboundIsDisabled();
  const isDisabled = false; // TODO: fix after merge

  const { debouncedMutateAsync: update } =
    useReturns.document.updateOutboundReturn();

  const { data } = useReturns.document.outboundReturn();
  const { transportReference, id } = data || { id: '' };

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
            update({ id, transportReference: e.target.value });
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
