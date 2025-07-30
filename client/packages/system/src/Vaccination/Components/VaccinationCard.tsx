import React from 'react';
import { VaccinationModal } from './VaccinationModal';
import { useEditModal } from '@common/hooks';
import { Clinician } from '../../Clinician';
import { VaccineCardTable } from './VaccineCardTable';
import { VaccinationCardItemFragment } from '../api/operations.generated';

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
  const { isOpen, onClose, onOpen, entity } =
    useEditModal<VaccinationCardItemFragment>();

  const openModal = (row: VaccinationCardItemFragment) => {
    onOpen(row);
  };

  return (
    <>
      {isOpen && entity && (
        <VaccinationModal
          isOpen
          encounterId={encounterId}
          cardRow={entity}
          onClose={onClose}
          defaultClinician={clinician}
          onOk={onOk}
        />
      )}
      <VaccineCardTable
        programEnrolmentId={programEnrolmentId}
        openModal={openModal}
        encounterId={encounterId}
      />
    </>
  );
};
