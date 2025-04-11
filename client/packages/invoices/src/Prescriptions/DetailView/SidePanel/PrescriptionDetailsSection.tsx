import React, { FC, memo, useEffect, useState } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  BasicTextInput,
  useDebouncedValueCallback,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';

export const PrescriptionDetailsSectionComponent: FC = () => {
  const t = useTranslation();

  const {
    query: { data },
    isDisabled,
    update: { update },
  } = usePrescription();

  const { createdDatetime, theirReference } = data ?? {};

  const [theirReferenceInput, setTheirReferenceInput] =
    useState(theirReference);

  const debouncedUpdate = useDebouncedValueCallback(
    update,
    [theirReferenceInput],
    1500
  );

  useEffect(() => {
    if (!data) return;
    const { theirReference } = data;
    setTheirReferenceInput(theirReference);
  }, [data]);

  if (!createdDatetime) return null;

  return (
    <DetailPanelSection title={t('heading.prescription-details')}>
      <Grid container gap={0.5} key="prescription-details">
        <PanelRow>
          <PanelLabel>{t('label.reference')}</PanelLabel>
          <BasicTextInput
            disabled={isDisabled}
            size="small"
            fullWidth
            slotProps={{
              input: {
                sx: {
                  backgroundColor: theme => theme.palette.background.white,
                },
              },
            }}
            value={theirReferenceInput ?? ''}
            onChange={event => {
              setTheirReferenceInput(event.target.value);
              debouncedUpdate({ theirReference: event.target.value });
            }}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PrescriptionDetailsSection = memo(
  PrescriptionDetailsSectionComponent
);
