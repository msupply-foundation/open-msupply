import { useEffect, useRef, useState } from 'react';
import {
  FnUtils,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemVariantFragment } from '../../operations.generated';

export function useItemVariant({
  itemId,
  variant,
}: {
  itemId: string;
  variant: ItemVariantFragment | null;
}) {
  const t = useTranslation();
  const { mutateAsync } = useUpsert({
    itemId,
  });

  const [draft, setDraft] = useState<ItemVariantFragment>(
    variant ?? {
      __typename: 'ItemVariantNode',
      id: FnUtils.generateUUID(),
      name: '',
      manufacturerId: '',
      coldStorageTypeId: '',
      packagingVariants: [
        {
          __typename: 'PackagingVariantNode',
          id: '1',
          packagingLevel: 1,
          name: t('label.primary'),
          packSize: 1,
          volumePerUnit: 1,
        },
        {
          __typename: 'PackagingVariantNode',
          id: '2',
          packagingLevel: 2,
          name: t('label.secondary'),
          packSize: 2,
          volumePerUnit: 2,
        },
        {
          __typename: 'PackagingVariantNode',
          id: '3',
          packagingLevel: 3,
          name: t('label.tertiary'),
          packSize: 3,
          volumePerUnit: 3,
        },
      ],
    }
  );

  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  return {
    draft,
    isComplete: getIsComplete(draft),
    updateDraft: (update: Partial<ItemVariantFragment>) =>
      setDraft({ ...draftRef.current, ...update }),
    save: mutateAsync,
  };
}

const useUpsert = ({ itemId }: { itemId: string }) => {
  // const { api, storeId, queryClient } = useVaccinationsGraphQL();
  const t = useTranslation();

  const mutationFn = async (input: ItemVariantFragment) => {
    console.log('input', input);
    // const apiResult = await api.insertVaccination({
    //   storeId,
    //   input: {
    //     id: FnUtils.generateUUID(),
    //     encounterId,
    //     vaccineCourseDoseId,
    //     facilityNameId: isOtherFacility ? undefined : input?.facilityId,
    //     facilityFreeText: isOtherFacility ? input.facilityFreeText : undefined,
    //     clinicianId: isOtherFacility ? undefined : input?.clinician?.id,
    //     given: input.given ?? false,
    //     vaccinationDate: Formatter.naiveDate(input.date ?? new Date()),
    //     comment: input.comment,
    //     notGivenReason: input.notGivenReason,
    //     stockLineId:
    //       input.given && !isOtherFacility ? input.stockLine?.id : undefined,
    //   },
    // });
    // // will be empty if there's a generic error, such as permission denied
    // if (!isEmpty(apiResult)) {
    //   const result = apiResult.insertVaccination;
    //   if (result.__typename === 'VaccinationNode') {
    //     return result;
    //   }
    // }
    // throw new Error(t('error.failed-to-save-item-variant'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      // item
      // queryClient.invalidateQueries([VACCINATION_CARD]);
    },
  });
};

function getIsComplete(draft: ItemVariantFragment) {
  return !!draft.name;
}
