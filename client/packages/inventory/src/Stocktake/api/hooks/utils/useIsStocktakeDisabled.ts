import { useStocktake } from '../document/useStocktake';
import { isStocktakeDisabled } from '../../../../utils';

export const useIsStocktakeDisabled = (): boolean => {
  const { data } = useStocktake();
  if (!data) return true;
  return isStocktakeDisabled(data);
};
