import React from 'react';
import { VaccinationModal } from './VaccinationModal';
import { useConfirmOnLeaving, useEditModal } from '@common/hooks';
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
  // todo, only when not visited
  const { setIsDirty } = useConfirmOnLeaving('vaccination-card');

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
          setTouched={setIsDirty}
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
