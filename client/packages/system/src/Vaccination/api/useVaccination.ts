import { useState } from 'react';
import {
  FnUtils,
  Formatter,
  isEmpty,
  setNullableInput,
  UpdateVaccinationInput,
  useMutation,
  useQuery,
  useTranslation,
} from '@openmsupply-client/common';

import { Clinician } from '../../Clinician';
import { useVaccinationsGraphQL } from './useVaccinationsGraphQL';
import { VACCINATION, VACCINATION_CARD } from './keys';
import { OTHER_FACILITY } from '../Components/FacilitySearchInput';
import {
  VaccinationCardItemFragment,
  VaccinationQuery,
} from './operations.generated';

export interface VaccinationStockLine {
  id: string;
  batch?: string | null;
}

export interface VaccinationDraft {
  facilityFreeText?: string | null;
  facilityId: string;
  clinician?: Clinician | null;
  date: Date | null;
  given?: boolean | null;
  comment?: string | null;
  itemId?: string | null;
  item?: {
    id: string;
    name: string;
  } | null;
  stockLine?: VaccinationStockLine | null;
  notGivenReason?: string | null;
  createTransactions: boolean;
  enteredAtOtherFacility?: {
    id: string;
    name: string;
  };
}

export function useVaccination({
  cardRow,
  encounterId,
  defaultClinician,
}: {
  encounterId?: string;
  defaultClinician?: Clinician;
  cardRow: VaccinationCardItemFragment;
}) {
  const { store } = useVaccinationsGraphQL();

  const vaccineCourseDoseId = cardRow.vaccineCourseDoseId;
  const vaccinationId = cardRow.vaccinationId ?? undefined;

  const { data: dose, isLoading: doseLoading } =
    useDoseQuery(vaccineCourseDoseId);

  const { data: vaccination, isLoading: vaccinationLoading } =
    useVaccinationQuery(vaccinationId);

  const { mutateAsync: insert } = useInsert({
    encounterId,
    vaccineCourseDoseId,
  });

  const { mutateAsync: update } = useUpdate(vaccination);

  const [patch, setPatch] = useState<Partial<VaccinationDraft>>({});

  const {
    clinician,
    vaccinationDate,
    comment,
    given,
    notGivenReason,
    stockLine,
    item,
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
    item,
    itemId: item?.id,

    createTransactions: vaccination ? false : true, // When editing - opt in to more transactions being created

    enteredAtOtherFacility:
      facilityNameId && facilityNameId !== store?.nameId
        ? { id: facilityNameId, name: cardRow.facilityName ?? '' }
        : undefined,
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
  const t = useTranslation();

  const mutationFn = async (input: VaccinationDraft) => {
    if (!encounterId) return;

    const isOtherFacility = input.facilityId === OTHER_FACILITY;
    const shouldUpdateStockLine =
      input.given && !isOtherFacility && input.createTransactions;

    const apiResult = await api.insertVaccination({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        encounterId,
        vaccineCourseDoseId,

        facilityNameId: isOtherFacility ? undefined : input?.facilityId,
        facilityFreeText: isOtherFacility ? input.facilityFreeText : undefined,

        clinicianId: isOtherFacility ? undefined : input?.clinician?.id,

        given: input.given ?? false,
        vaccinationDate: Formatter.naiveDate(input.date ?? new Date()),
        comment: input.comment,
        notGivenReason: input.notGivenReason,
        itemId: input.itemId,
        stockLineId: shouldUpdateStockLine ? input.stockLine?.id : undefined,
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

const useUpdate = (vaccination: VaccinationQuery['vaccination']) => {
  const { api, storeId, queryClient } = useVaccinationsGraphQL();
  const t = useTranslation();

  const mutationFn = async (input: VaccinationDraft) => {
    if (!vaccination) {
      throw new Error(t('error.failed-to-save-vaccination'));
    }

    const isOtherFacility = input.facilityId === OTHER_FACILITY;

    // We should send a reduced input to the API if vaccination was given
    // from another store
    const editingGivenFromOtherStore =
      vaccination.given && vaccination.givenStoreId !== storeId;

    const apiInput: UpdateVaccinationInput = editingGivenFromOtherStore
      ? {
          id: vaccination.id,
          comment: input.comment,
        }
      : {
          id: vaccination.id,
          given: input.given ?? false,
          vaccinationDate: Formatter.naiveDate(input.date ?? new Date()),
          comment: input.comment,
          notGivenReason: !input.given ? input.notGivenReason : null,

          clinicianId: setNullableInput(
            'id',
            isOtherFacility ? null : input.clinician
          ),
          itemId: setNullableInput('itemId', input.given ? input : null),
          stockLineId: setNullableInput(
            'id',
            input.given && !isOtherFacility ? input.stockLine : null
          ),
          facilityNameId: setNullableInput(
            'facilityId',
            isOtherFacility ? null : input
          ),
          facilityFreeText: setNullableInput(
            'facilityFreeText',
            isOtherFacility ? input : null
          ),

          updateTransactions: input.createTransactions,
        };

    const apiResult = await api.updateVaccination({
      storeId,
      input: apiInput,
    });

    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.updateVaccination;
      return result;
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
