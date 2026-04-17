import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import React, { createContext, useContext, useState } from 'react';
import {
  AdjustmentReasonNotProvidedErrorFragment,
  AdjustmentReasonNotValidErrorFragment,
  SnapshotCountCurrentCountMismatchLineErrorFragment,
  StockLineReducedBelowZeroErrorFragment,
} from '../api';

export type StocktakeLineError =
  | AdjustmentReasonNotProvidedErrorFragment
  | StockLineReducedBelowZeroErrorFragment
  | AdjustmentReasonNotValidErrorFragment
  | SnapshotCountCurrentCountMismatchLineErrorFragment;

const useStocktakeLineErrors = () => {
  const [errors, setErrors] = useState<{
    [stocktakeLineId: string]: StocktakeLineError | undefined;
  }>({});

  const getError = ({ id }: RecordWithId): StocktakeLineError | undefined => {
    return errors[id];
  };

  const setError = (id: string, error: StocktakeLineError) => {
    setErrors(errors => ({ ...errors, [id]: error }));
  };

  const unsetError = (id: string) => {
    setErrors(errors => ({ ...errors, [id]: undefined }));
  };

  const unsetAll = () => {
    setErrors({});
  };

  return { errors, setError, setErrors, getError, unsetError, unsetAll };
};
export type UseStocktakeLineErrors = ReturnType<typeof useStocktakeLineErrors>;

const StocktakeLineErrorContext = createContext<UseStocktakeLineErrors>(
  {} as any
);

export const useStocktakeLineErrorContext = () => {
  const context = useContext(StocktakeLineErrorContext);

  if (!context) throw new Error('Context does not exist');

  return context;
};

export const StocktakeLineErrorProvider: React.FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const state = useStocktakeLineErrors();

  return (
    <StocktakeLineErrorContext.Provider value={state}>
      {children}
    </StocktakeLineErrorContext.Provider>
  );
};
