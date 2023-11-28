import { useUrlQuery } from '@common/hooks';
import { ItemNode } from '@common/types';
import { RegexUtils } from '../regex';

export const useItemUtils = () => {
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['codeOrName'],
  });

  const itemFilter = (urlQuery['codeOrName'] as string) ?? '';

  const setItemFilter = (itemFilter: string) =>
    updateQuery({ codeOrName: itemFilter });

  const matchItem = (itemFilter: string, { name, code }: Partial<ItemNode>) => {
    const filter = RegexUtils.escapeChars(itemFilter);
    return (
      RegexUtils.includes(filter, name ?? '') ||
      RegexUtils.includes(filter, code ?? '')
    );
  };

  return {
    itemFilter,
    setItemFilter,
    matchItem,
  };
};
