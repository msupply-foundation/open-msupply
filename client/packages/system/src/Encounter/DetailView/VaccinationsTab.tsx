import React from 'react';
import { VaccinationModal } from '../../Vaccination';
import { useEditModal } from '@common/hooks';
import { Clinician } from '../../Clinician';

export const VaccinationsTab = ({
  clinician,
  encounterId,
}: {
  encounterId: string;
  clinician?: Clinician;
}) => {
  const { isOpen, onClose, onOpen } = useEditModal();

  return (
    <>
      {isOpen && (
        <VaccinationModal
          isOpen
          encounterId={encounterId}
          vaccinationId={undefined}
          vaccineCourseDoseId="0191b035-927d-7a0b-89cd-ae581a033429"
          onClose={onClose}
          defaultClinician={clinician}
        />
      )}
      <div
        style={{ display: 'flex', flexDirection: 'column', margin: '0 auto' }}
      >
        <h1>Vaccination Card</h1>
        <button onClick={onOpen}>
          Pretend this is the Diphtheria 1 row in the card
        </button>
      </div>
    </>
  );
};
