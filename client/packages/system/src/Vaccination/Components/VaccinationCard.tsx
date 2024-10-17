import React from 'react';
import { VaccinationModal } from './VaccinationModal';
import { useEditModal } from '@common/hooks';
import { Clinician } from '../../Clinician';
import { VaccineCardTable } from './VaccineCardTable';

export const VaccinationCard = ({
  clinician,
  programEnrolmentId,
  encounterId,
}: {
  programEnrolmentId: string;
  encounterId?: string;
  clinician?: Clinician;
}) => {
  const { isOpen, onClose, onOpen, entity } = useEditModal<{
    vaccinationId?: string | undefined;
    vaccineCourseDoseId: string;
  }>();

  const openModal = (
    vaccinationId: string | null | undefined,
    vaccineCourseDoseId: string
  ) => {
    onOpen({
      vaccinationId: vaccinationId === null ? undefined : vaccinationId,
      vaccineCourseDoseId,
    });
  };

  const { vaccinationId, vaccineCourseDoseId } = entity ?? {};

  return (
    <>
      {isOpen && vaccineCourseDoseId && (
        <VaccinationModal
          isOpen
          encounterId={encounterId}
          vaccinationId={vaccinationId}
          vaccineCourseDoseId={vaccineCourseDoseId}
          onClose={onClose}
          defaultClinician={clinician}
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
