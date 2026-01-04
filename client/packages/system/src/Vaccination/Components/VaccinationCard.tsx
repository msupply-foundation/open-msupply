import React from 'react';
import { VaccinationModal } from './VaccinationModal';
import { useEditModal } from '@common/hooks';
import { Clinician } from '../../Clinician';
import { VaccineCardTable } from './VaccineCardTable';
import { VaccinationCardItemFragment } from '../api/operations.generated';
import { usePatientVaccineCard } from '../api/usePatientVaccineCard';
import { getPreviousDoseStatus, isEditable } from '../utils';

export const VaccinationCard = ({
  clinician,
  programEnrolmentId,
  encounterId,
  onOk = () => {},
}: {
  programEnrolmentId: string;
  encounterId?: string;
  clinician?: Clinician;
  onOk?: () => void;
}) => {
  const {
    query: { data, isLoading },
  } = usePatientVaccineCard(programEnrolmentId);
  const { isOpen, onClose, onOpen, entity } =
    useEditModal<VaccinationCardItemFragment>();

  const openModal = (row: VaccinationCardItemFragment) => {
    onOpen(row);
  };

  const previousDoseStatus = entity
    ? getPreviousDoseStatus(entity, data?.items ?? [])
    : undefined;

  const isDoseEditable = entity ? isEditable(entity, data?.items ?? []) : false;

  return (
    <>
      {isOpen && entity && (
        <VaccinationModal
          isOpen
          encounterId={encounterId}
          cardRow={entity}
          onClose={onClose}
          defaultClinician={clinician}
          previousDoseStatus={previousDoseStatus}
          isEditable={isDoseEditable}
          onOk={onOk}
        />
      )}
      <VaccineCardTable
        data={data}
        isLoading={isLoading}
        programEnrolmentId={programEnrolmentId}
        openModal={openModal}
        encounterId={encounterId}
      />
    </>
  );
};
