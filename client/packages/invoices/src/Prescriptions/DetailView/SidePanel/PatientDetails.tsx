import React, { memo, useState } from 'react';
import {
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  Autocomplete,
  PanelField,
  UNDEFINED_STRING_VALUE,
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
  const { diagnosis, patient } = data ?? {};

  const [selected, setSelected] = useState<Option | null>();

  type Option = { id: string; value: string; label: string };

  const {
    query: { data: diagnosisOptions },
  } = useDiagnosisOptions();

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
      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('label.patient-name')}</PanelLabel>
        <PanelField>{patient?.name ?? UNDEFINED_STRING_VALUE} </PanelField>
      </PanelRow>

      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('label.code')}</PanelLabel>
        <PanelField>{patient?.code ?? UNDEFINED_STRING_VALUE} </PanelField>
      </PanelRow>

      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('label.date-of-birth')}</PanelLabel>
        <PanelField>
          {patient?.dateOfBirth ?? UNDEFINED_STRING_VALUE}
        </PanelField>
      </PanelRow>

      <PanelRow style={{ marginTop: 12 }}>
        <PanelLabel fontWeight="bold">{t('label.gender')}</PanelLabel>
        <PanelField>{patient?.gender ?? UNDEFINED_STRING_VALUE}</PanelField>
      </PanelRow>

      <PanelRow style={{ marginTop: 12 }}>
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
        />
      </PanelRow>
    </DetailPanelSection>
  );
};

export const PatientDetails = memo(PatientDetailsComponent);
