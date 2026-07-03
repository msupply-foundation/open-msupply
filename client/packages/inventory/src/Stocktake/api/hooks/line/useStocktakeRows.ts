import { ArrayUtils } from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../../operations.generated';
import { StocktakeSummaryItem } from '../../../../types';
import { useStocktakeOld } from '..';
import { isStocktakeDisabled } from '../../../../utils';
import { useStocktakeLines } from './useStocktakeLines';
import { useMemo } from 'react';
import { useItemUtils, useUrlQuery } from '@openmsupply-client/common';
import { useCampaigns } from '@openmsupply-client/system/src/Manage/Campaigns/api';

const getStocktakeItems = (lines: StocktakeLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      item: lines[0]?.item,
      lines,
    } as StocktakeSummaryItem;
  });

export const useStocktakeRows = (itemId?: string) => {
  const { data: stocktake } = useStocktakeOld.document.get();
  const { data: lineData, isLoading } = useStocktakeLines(
    stocktake?.id ?? '',
    itemId
  );

  const { itemFilter, matchItem } = useItemUtils();
  const { urlQuery } = useUrlQuery();
  const campaignFilter = (urlQuery['campaignId'] as string) ?? '';
  const lines = lineData?.nodes;

  // Source options from all campaigns (value = id), matching the Stock list
  // view; filtering itself is still done client-side over the loaded lines.
  const {
    query: { data: campaigns },
  } = useCampaigns({
    sortBy: { key: 'name', direction: 'asc', isDesc: false },
    first: 1000,
  });

  const campaignOptions = useMemo(
    () => campaigns?.nodes?.map(c => ({ label: c.name, value: c.id })) ?? [],
    [campaigns]
  );

  const filteredLines = useMemo(() => {
    return lines
      ?.filter(item => matchItem(itemFilter, item.item))
      .filter(line => !campaignFilter || line.campaign?.id === campaignFilter);
  }, [lines, itemFilter, campaignFilter]);

  const items = useMemo(
    () => getStocktakeItems(filteredLines ?? []),
    [filteredLines]
  );

  const totalLineCount = lineData?.totalCount ?? 0;
  const isDisabled = !stocktake || isStocktakeDisabled(stocktake);

  return {
    isDisabled,
    isLoading,
    items,
    lines: filteredLines ?? [],
    totalLineCount,
    campaignOptions,
  };
};
