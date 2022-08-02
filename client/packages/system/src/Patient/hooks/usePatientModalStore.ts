import { zustand } from '@openmsupply-client/common';
import { PatientModal } from '../DetailView';

interface PatientModalState {
  current: PatientModal | undefined;
  setCurrent: (current: PatientModal | undefined) => void;
}

export const usePatientModalStore = zustand<PatientModalState>(set => ({
  current: undefined,
  setCurrent: (current: PatientModal | undefined) =>
    set(state => ({ ...state, current })),
}));
