import { useUrlQuery } from '@common/hooks';
import { ItemNode } from '@common/types';
import { RegexUtils } from '../regex';

export const ItemUtils = {
  itemFilter: () => {
    const { urlQuery, updateQuery } = useUrlQuery({
      skipParse: ['codeOrName'],
    });
    return {
      itemFilter: urlQuery.codeOrName ?? '',
      setItemFilter: (itemFilter: string) =>
        updateQuery({ codeOrName: itemFilter }),
    };
  },
  matchItem: (itemFilter: string, { name, code }: Partial<ItemNode>) => {
    const filter = RegexUtils.escapeChars(itemFilter);
    return (
      RegexUtils.includes(filter, name ?? '') ||
      RegexUtils.includes(filter, code ?? '')
    );
  },
};
