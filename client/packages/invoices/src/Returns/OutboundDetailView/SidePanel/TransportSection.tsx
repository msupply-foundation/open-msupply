import React, { FC, memo, useEffect, useState } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  // const isDisabled = useReturns.utils.outboundIsDisabled();
  const isDisabled = false; // TODO: fix after merge

  const { debouncedMutateAsync: debouncedUpdate } =
    useReturns.document.updateOutboundReturn();

  const { refetch, data } = useReturns.document.outboundReturn();
  const id = data?.id ?? '';

  const [reference, setReference] = useState('');

  useEffect(() => {
    async function setTransportReference() {
      const { data } = await refetch();
      setReference(data?.transportReference ?? '');
    }

    setTransportReference();
  }, []);

  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
        <PanelLabel display="flex" alignItems="center">
          {t('heading.reference')}
        </PanelLabel>
        <BufferedTextInput
          disabled={isDisabled}
          onChange={e => {
            setReference(e.target.value);
            debouncedUpdate({ id, transportReference: e.target.value });
          }}
          value={reference}
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
