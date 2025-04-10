import React, { memo, useState } from 'react';
import {
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  Autocomplete,
  PanelField,
  UNDEFINED_STRING_VALUE,
  Grid,
  useTheme,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';
import { useDiagnosisOptions } from '../../api/hooks/useDiagnosisOptions';
import {
  useInsurancePolicies,
  useInsuranceProviders,
} from '@openmsupply-client/system/src/Patient/apiModern';

type Option = { id: string; value: string; label: string };

export const PatientDetailsComponent = () => {
  const theme = useTheme();
  const t = useTranslation();
  const [selected, setSelected] = useState<Option | null>();

  const {
    query: { data },
    isDisabled,
    update: { update },
  } = usePrescription();
  const { diagnosis, patient } = data ?? {};

  const {
    query: { data: diagnosisOptions },
  } = useDiagnosisOptions();

  const {
    query: { data: insuranceProvidersData },
  } = useInsuranceProviders();

  const {
    query: { data: insurancePoliciesData },
  } = useInsurancePolicies(patient?.id ?? '');

  const displayValue =
    selected === undefined
      ? {
          label: diagnosis?.description ?? '',
          value: diagnosis?.id ?? '',
          id: diagnosis?.id ?? '',
        }
      : selected;

  return (
    <DetailPanelSection title={t('heading.patient-details')}>
      <Grid container gap={0.5} key="patient-details">
        <PanelRow>
          <PanelLabel fontWeight="bold">{t('label.patient-name')}</PanelLabel>
          <PanelField>{patient?.name ?? UNDEFINED_STRING_VALUE} </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel fontWeight="bold">{t('label.code')}</PanelLabel>
          <PanelField>{patient?.code ?? UNDEFINED_STRING_VALUE} </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel fontWeight="bold">{t('label.date-of-birth')}</PanelLabel>
          <PanelField>
            {patient?.dateOfBirth ?? UNDEFINED_STRING_VALUE}
          </PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel fontWeight="bold">{t('label.gender')}</PanelLabel>
          <PanelField>{patient?.gender ?? UNDEFINED_STRING_VALUE}</PanelField>
        </PanelRow>
        {insuranceProvidersData?.length > 0 && (
          <PanelRow>
            <PanelLabel fontWeight="bold">
              {t('label.insurance-status')}
            </PanelLabel>
            <PanelField>
              {(insurancePoliciesData?.length ?? 0) > 0
                ? t('label.insured')
                : t('label.not-insured')}
            </PanelField>
          </PanelRow>
        )}
        <PanelRow>
          <PanelLabel>{t('heading.diagnosis')}</PanelLabel>
          <Autocomplete
            fullWidth
            clearable
            options={diagnosisOptions ?? []}
            value={displayValue}
            onChange={(_e, selected) => {
              setSelected(selected);
              if (selected) {
                update({ diagnosisId: selected.value });
              } else {
                // Updated value needs to be null for nullable input to work correctly
                update({ diagnosisId: null });
              }
            }}
            disabled={isDisabled}
            textSx={{ backgroundColor: theme.palette.background.white }}
          />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const PatientDetails = memo(PatientDetailsComponent);
