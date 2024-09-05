import React from 'react';
import { VaccinationModal } from '../../Vaccination';
import { useEditModal } from '@common/hooks';
import { Clinician } from '../../Clinician';

export const VaccinationsTab = ({ clinician }: { clinician?: Clinician }) => {
  const { isOpen, onClose, onOpen } = useEditModal();

  return (
    <>
      {isOpen && (
        <VaccinationModal
          isOpen
          vaccinationId={undefined}
          vaccineCourseDoseId="0191b035-927d-7a0b-89cd-ae581a033429"
          onClose={onClose}
          defaultClinician={clinician}
        />
      )}
      <h1>Vaccination Card</h1>
      <button onClick={onOpen}>OPEN MODAL</button>
    </>
  );
};
