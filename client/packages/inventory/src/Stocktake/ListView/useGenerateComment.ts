import { useFormatDateTime, useTranslation } from '@common/intl';
import { CreateStocktakeModalState, StocktakeType } from './types';

export const useGenerateComment = ({
  masterList,
  location,
  expiryDate,
  vvmStatus,
  type,
}: CreateStocktakeModalState) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  return () => {
    if (type !== StocktakeType.FILTERED) return '';

    const filterComments: string[] = [];

    if (!!masterList) {
      filterComments.push(
        t('stocktake.master-list-template', {
          masterList: masterList.name,
        })
      );
    }
    if (!!location) {
      filterComments.push(
        t('stocktake.location-template', {
          location: location.code,
        })
      );
    }
    if (!!expiryDate) {
      filterComments.push(
        t('stocktake.expires-before-template', {
          date: localisedDate(expiryDate),
        })
      );
    }
    if (!!vvmStatus) {
      filterComments.push(
        t('stocktake.vvm-status-template', {
          vvmStatus: vvmStatus.description,
        })
      );
    }

    if (filterComments.length === 0) return undefined;
    if (filterComments.length === 1)
      return t('stocktake.comment-template', { filters: filterComments[0] });

    const comments = t('stocktake.comment-and-template', {
      start: filterComments.slice(0, -1).join(', '),
      end: filterComments[filterComments.length - 1],
    });

    return t('stocktake.comment-template', { filters: comments });
  };
};
