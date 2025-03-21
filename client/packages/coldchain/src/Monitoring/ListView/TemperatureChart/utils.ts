import { FilterByWithBoolean } from '@common/hooks';
import { DateUtils } from '@common/intl';

export const getDateRangeAndFilter = (
  filterBy: FilterByWithBoolean | null
): { filterBy: FilterByWithBoolean; fromDatetime: Date; toDatetime: Date } => {
  const now = DateUtils.setMilliseconds(new Date(), 0);
  let fromDatetime = DateUtils.addDays(now, -1);
  let toDatetime = now;
  const filterDatetime = filterBy?.['datetime'];

  if (!!filterDatetime && typeof filterDatetime === 'object') {
    const hasAfterOrEqualTo =
      'afterOrEqualTo' in filterDatetime && !!filterDatetime['afterOrEqualTo'];

    if (hasAfterOrEqualTo)
      fromDatetime = new Date(String(filterDatetime['afterOrEqualTo']));

    if (
      'beforeOrEqualTo' in filterDatetime &&
      !!filterDatetime['beforeOrEqualTo']
    ) {
      toDatetime = new Date(String(filterDatetime['beforeOrEqualTo']));

      // the 'from' date needs to be before the 'to' date
      // if this isn't the case, and if 'from' is not set,
      // then set to a day prior to the 'to' date
      if (fromDatetime >= toDatetime && !hasAfterOrEqualTo) {
        fromDatetime = DateUtils.addDays(new Date(toDatetime), -1);
      }
    }
  }

  return {
    filterBy: {
      ...filterBy,
      datetime: {
        afterOrEqualTo: fromDatetime.toISOString(),
        beforeOrEqualTo: toDatetime.toISOString(),
      },
    },
    fromDatetime,
    toDatetime,
  };
};
