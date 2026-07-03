import { ArrayUtils } from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../../operations.generated';
import { StocktakeSummaryItem } from '../../../../types';
import { useStocktakeOld } from '..';
import { isStocktakeDisabled } from '../../../../utils';
import { useStocktakeLines } from './useStocktakeLines';
import { useMemo } from 'react';
import { useItemUtils, useUrlQuery } from '@openmsupply-client/common';

const getStocktakeItems = (lines: StocktakeLineFragment[]) =>
  Object.entries(ArrayUtils.groupBy(lines, 'itemId')).map(([itemId, lines]) => {
    return {
      id: itemId,
      item: lines[0]?.item,
      lines,
    } as StocktakeSummaryItem;
  });

const getCampaignOrProgramName = (line: StocktakeLineFragment) =>
  line.campaign?.name ?? line.program?.name ?? '';

export const useStocktakeRows = (itemId?: string) => {
  const { data: stocktake } = useStocktakeOld.document.get();
  const { data: lineData, isLoading } = useStocktakeLines(
    stocktake?.id ?? '',
    itemId
  );

  const { itemFilter, matchItem } = useItemUtils();
  const { urlQuery } = useUrlQuery();
  const campaignFilter = (urlQuery['campaign'] as string) ?? '';
  const lines = lineData?.nodes;

  const campaignOptions = useMemo(() => {
    if (!lines) return [];
    const names = new Set<string>();
    lines.forEach(line => {
      const name = getCampaignOrProgramName(line);
      if (name) names.add(name);
    });
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ label: name, value: name }));
  }, [lines]);

  const filteredLines = useMemo(() => {
    return lines
      ?.filter(item => matchItem(itemFilter, item.item))
      .filter(
        line =>
          !campaignFilter || getCampaignOrProgramName(line) === campaignFilter
      );
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
