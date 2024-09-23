import { useState } from 'react';
import {
  FnUtils,
  Formatter,
  isEmpty,
  setNullableInput,
  useMutation,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';

import { Clinician } from '../../Clinician';
import { useVaccinationsGraphQL } from './useVaccinationsGraphQL';
import { VACCINATION, VACCINATION_CARD } from './keys';
import { OTHER_FACILITY } from '../Components/FacilitySearchInput';

export interface VaccinationStockLine {
  id: string;
  itemId: string;
  batch?: string | null;
}

export interface VaccinationDraft {
  facilityFreeText?: string | null;
  facilityId: string;
  clinician?: Clinician | null;
  date: Date | null;
  given?: boolean | null;
  comment?: string | null;
  itemId?: string;
  stockLine?: VaccinationStockLine | null;
  notGivenReason?: string | null;
  editExistingTransactions?: boolean;
}

export function useVaccination({
  vaccineCourseDoseId,
  vaccinationId,
  encounterId,
  defaultClinician,
}: {
  vaccineCourseDoseId: string;
  encounterId?: string;
  vaccinationId: string | undefined;
  defaultClinician?: Clinician;
}) {
  const { store } = useVaccinationsGraphQL();

  const { data: dose, isLoading: doseLoading } =
    useDoseQuery(vaccineCourseDoseId);

  const { data: vaccination, isLoading: vaccinationLoading } =
    useVaccinationQuery(vaccinationId);

  const { mutateAsync: insert } = useInsert({
    encounterId,
    vaccineCourseDoseId,
  });

  const { mutateAsync: update } = useUpdate(vaccinationId);

  const [patch, setPatch] = useState<Partial<VaccinationDraft>>({});

  const {
    clinician,
    vaccinationDate,
    comment,
    given,
    notGivenReason,
    stockLine,
    facilityNameId,
    facilityFreeText,
  } = vaccination ?? {};

  const defaults: VaccinationDraft = {
    // Default to today
    date: vaccinationDate ? new Date(vaccinationDate) : new Date(),

    // If new vaccination, default to encounter clinician
    clinician: vaccination ? clinician : defaultClinician,
    // If new vaccination, default to this store
    facilityId:
      (vaccination ? facilityNameId : store?.nameId) ?? OTHER_FACILITY,
    facilityFreeText: facilityFreeText ?? '',

    // Populate with existing vaccination data
    comment: comment ?? '',
    stockLine,
    given,
    notGivenReason,
    itemId: stockLine?.itemId,

    editExistingTransactions: false,
  };

  const draft: VaccinationDraft = { ...defaults, ...patch };

  return {
    query: { dose, vaccination, isLoading: doseLoading || vaccinationLoading },
    draft,
    isComplete: getIsComplete(draft),
    isDirty: Object.keys(patch).length > 0,
    store,
    updateDraft: (update: Partial<VaccinationDraft>) =>
      setPatch({ ...patch, ...update }),
    saveVaccination: vaccinationId ? update : insert,
  };
}

const useDoseQuery = (vaccineCourseDoseId: string) => {
  const { api } = useVaccinationsGraphQL();

  return useQuery({
    queryKey: [VACCINATION, vaccineCourseDoseId],
    queryFn: async () => {
      const result = await api.vaccineCourseDose({
        doseId: vaccineCourseDoseId,
      });

      if (result.vaccineCourseDose.__typename === 'VaccineCourseDoseNode') {
        return result.vaccineCourseDose;
      }
    },
  });
};

const useVaccinationQuery = (vaccinationId: string | undefined) => {
  const { api, storeId } = useVaccinationsGraphQL();

  return useQuery({
    queryKey: [VACCINATION, vaccinationId],
    queryFn: async () => {
      if (!vaccinationId) {
        return null;
      }
      const result = await api.vaccination({ vaccinationId, storeId });

      if (result.vaccination?.__typename === 'VaccinationNode') {
        return result.vaccination;
      }
    },
    enabled: !!vaccinationId,
  });
};

const useInsert = ({
  encounterId,
  vaccineCourseDoseId,
}: {
  encounterId?: string;
  vaccineCourseDoseId: string;
}) => {
  const { api, storeId, queryClient } = useVaccinationsGraphQL();
  const t = useTranslation('dispensary');

  const mutationFn = async (input: VaccinationDraft) => {
    if (!encounterId) return;

    const apiResult = await api.insertVaccination({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        encounterId,
        vaccineCourseDoseId,

        facilityNameId:
          input.facilityId === OTHER_FACILITY ? undefined : input?.facilityId,
        facilityFreeText:
          input.facilityId === OTHER_FACILITY
            ? input.facilityFreeText
            : undefined,

        given: input.given ?? false,
        vaccinationDate: Formatter.naiveDate(input.date ?? new Date()),
        clinicianId: input.clinician?.id,
        comment: input.comment,
        notGivenReason: input.notGivenReason,
        stockLineId: input.stockLine?.id,
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.insertVaccination;

      if (result.__typename === 'VaccinationNode') {
        return result;
      }
    }

    throw new Error(t('error.failed-to-save-vaccination'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([VACCINATION]);
      queryClient.invalidateQueries([VACCINATION_CARD]);
    },
  });
};

const useUpdate = (vaccinationId: string | undefined) => {
  const { api, storeId, queryClient } = useVaccinationsGraphQL();
  const t = useTranslation('dispensary');

  const mutationFn = async (input: VaccinationDraft) => {
    if (!vaccinationId) {
      throw new Error(t('error.failed-to-save-vaccination'));
    }

    const apiResult = await api.updateVaccination({
      storeId,
      input: {
        id: vaccinationId,
        given: input.given ?? false,
        vaccinationDate: Formatter.naiveDate(input.date ?? new Date()),
        clinicianId: setNullableInput('id', input.clinician),
        comment: input.comment,
        notGivenReason: input.notGivenReason,
        stockLineId: input.stockLine?.id,

        facilityNameId: {
          value:
            input.facilityId === OTHER_FACILITY ? undefined : input?.facilityId,
        },
        facilityFreeText: {
          value:
            input.facilityId === OTHER_FACILITY
              ? input.facilityFreeText
              : undefined,
        },

        updateTransactions: input.editExistingTransactions,
      },
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.updateVaccination;

      if (result.__typename === 'VaccinationNode') {
        return result;
      }
    }

    throw new Error(t('error.failed-to-save-vaccination'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([VACCINATION]);
      queryClient.invalidateQueries([VACCINATION_CARD]);
    },
  });
};

function getIsComplete(draft: VaccinationDraft) {
  const isForThisFacility = draft.facilityId !== OTHER_FACILITY;

  // Other facility requires free text
  if (!isForThisFacility && !draft.facilityFreeText) {
    return false;
  }

  if (draft.given === undefined) {
    return false;
  }

  // If not given, reason required
  if (draft.given === false && !draft.notGivenReason) {
    return false;
  }

  // If given:
  // We won't block the workflow if the user doesn't select a batch

  return true;
}
