import { usePatientGraphQL } from '../usePatientGraphQL';

export const usePatientVaccineCard = (patientId: string, programId: string) => {
  const { patientApi, storeId } = usePatientGraphQL();

  // TO-DO: Remove console.log once these variables actually used
  console.log(patientId, programId, patientApi, storeId);

  return { query: { data, isLoading: false } };
};

export type VaxCardData = typeof data;
// Hardcoding results until we figure out how to retrieve this nested data. This
// is roughly the shape we want -- back-end to provide?
const data = {
  vaccineCardItems: {
    id: 'EBCDDF44B6504E219D221EE3A1B13D46',
    programName: 'Immunization Program',
    patient: {
      name: 'Oliver Wood',
    },
    nodes: [
      {
        vaccineCourseDose: {
          id: '0191d538-4219-7d8e-af37-5a4f7008c927',
          label: 'General Dosing 1',
          minAgeMonths: 1,
          minIntervalDays: 30,
          vaccineCourseName: 'General Doses',
          vaccineCourseId: '0191d538-4219-7d8e-af37-5a4f7008c927',
        },
        vaccination: {
          createdDatetime: '2024-09-09 23:43:29.883540',
          vaccinationDate: '2024-09-10',
          given: true,
          notGivenReason: null,
          comment: 'All ok',
        },
      },
      {
        vaccineCourseDose: {
          id: '0191d538-4219-7d8e-af37-5a4f7008c927',
          label: 'General Dosing 2',
          minAgeMonths: 2,
          minIntervalDays: 30,
          vaccineCourseName: 'General Doses',
          vaccineCourseId: '0191d538-4219-7d8e-af37-5a4f7008c927',
        },
        vaccination: {
          createdDatetime: '2024-10-09 23:43:29.883540',
          vaccinationDate: '2024-10-10',
          given: false,
          notGivenReason: 'OUT_OF_STOCK',
          comment: 'Coming back next week',
        },
      },
      {
        vaccineCourseDose: {
          id: '0191d538-4219-7d8e-af37-5a4f7008c927',
          label: 'General Dosing 2',
          minAgeMonths: 3,
          minIntervalDays: 30,
          vaccineCourseName: 'General Doses',
          vaccineCourseId: '0191d538-4219-7d8e-af37-5a4f7008c927',
        },
        vaccination: null,
      },
    ],
  },
};
