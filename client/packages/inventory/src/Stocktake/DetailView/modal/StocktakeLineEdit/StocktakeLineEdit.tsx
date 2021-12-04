import React, { FC } from 'react';
import { StocktakeController, StocktakeItem } from '../../../../types';
import { ModalMode } from '../../DetailView';
import { StocktakeLineEditForm } from './StocktakeLineEditForm';

interface StocktakeLineEditProps {
  item: StocktakeItem | null;
  onChangeItem: (item: StocktakeItem | null) => void;
  mode: ModalMode;
  draft: StocktakeController;
}

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = ({
  item,
  draft,
  onChangeItem,
  mode,
}) => (
  <StocktakeLineEditForm
    item={item}
    onChangeItem={onChangeItem}
    mode={mode}
    draft={draft}
  />
);
