import { FC } from 'react';
import { StocktakeController, StocktakeItem } from '../../../../types';
import { ModalMode } from '../../DetailView';

interface StocktakeLineEditProps {
  item: StocktakeItem | null;
  onChangeItem: (item: StocktakeItem | null) => void;
  mode: ModalMode;
  draft: StocktakeController;
}

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = () => null;
