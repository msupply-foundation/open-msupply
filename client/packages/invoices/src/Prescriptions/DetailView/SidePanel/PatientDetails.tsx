import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  Autocomplete,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';
import { useDiagnosisOptions } from '../../api/hooks/useDiagnosisOptions';

export const PatientDetailsComponent = () => {
  const t = useTranslation();

  const {
    query: { data },
    isDisabled,
    update: { update },
  } = usePrescription();
  const { diagnosis } = data ?? {};

  const {
    query: { data: diagnosisOptions },
  } = useDiagnosisOptions();

  return (
    <DetailPanelSection title={t('heading.patient-details')}>
      <Grid container gap={0.5}>
        <>
          <PanelRow style={{ marginTop: 12 }}>
            <PanelLabel>{t('heading.diagnosis')}</PanelLabel>
            <Autocomplete
              fullWidth
              clearable
              options={diagnosisOptions ?? []}
              value={{
                label: diagnosis?.description ?? '',
                value: diagnosis?.id ?? '',
                id: diagnosis?.id ?? '',
              }}
              onChange={(_e, selected) =>
                update({ diagnosisId: selected?.value })
              }
              disabled={isDisabled}
            />
          </PanelRow>
        </>
      </Grid>
    </DetailPanelSection>
  );
};

export const PatientDetails = memo(PatientDetailsComponent);
