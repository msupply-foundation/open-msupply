import { useFormatDateTime, useTranslation } from '@common/intl';
import { useStocktake } from '../api';
import {
  FnUtils,
  Formatter,
  InsertStocktakeInput,
  useAuthContext,
} from '@openmsupply-client/common';

export type CreateStocktakeParams = {
  isInitialStocktake: boolean;
  masterListId?: string;
  locationId?: string;
  itemsHaveStock?: boolean;
  expiresBefore?: Date | null;
  comment?: string;
};

export const useCreateStocktake = () => {
  const t = useTranslation();
  const { mutateAsync, isLoading } = useStocktake.document.insert();
  const { user } = useAuthContext();
  const { localisedDate } = useFormatDateTime();

  const createStocktake = async ({
    masterListId,
    locationId,
    itemsHaveStock,
    expiresBefore,
    isInitialStocktake,
    comment,
  }: CreateStocktakeParams) => {
    const description = t('stocktake.description-template', {
      username: user ? user.name : 'unknown user',
      date: localisedDate(new Date()),
    });

    const input: InsertStocktakeInput = {
      id: FnUtils.generateUUID(),
      description,
      comment,
      masterListId,
      location: locationId ? { value: locationId } : undefined,
      itemsHaveStock,
      expiresBefore: expiresBefore
        ? (Formatter.naiveDate(expiresBefore) ?? undefined)
        : undefined,
      isInitialStocktake,
    };

    const result = await mutateAsync(input);

    if (result?.__typename === 'StocktakeNode') {
      return result.id;
    }
    throw new Error(t('error.failed-to-create-stocktake'));
  };

  return { createStocktake, isLoading };
};
