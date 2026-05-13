import React, { createContext, useContext, useState } from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { ItemCannotBeOrderedFragment } from '../api';

export type PurchaseOrderLineError = ItemCannotBeOrderedFragment;

const usePurchaseOrderLineErrors = () => {
  const [errors, setErrors] = useState<{
    [purchaseOrderLineId: string]: PurchaseOrderLineError | undefined;
  }>({});

  const getError = ({
    id,
  }: RecordWithId): PurchaseOrderLineError | undefined => errors[id];

  const setError = (id: string, error: PurchaseOrderLineError) => {
    setErrors(prev => ({ ...prev, [id]: error }));
  };

  const unsetError = (id: string) => {
    setErrors(prev => ({ ...prev, [id]: undefined }));
  };

  const unsetAll = () => {
    setErrors({});
  };

  return { errors, setError, setErrors, getError, unsetError, unsetAll };
};

export type UsePurchaseOrderLineErrors = ReturnType<
  typeof usePurchaseOrderLineErrors
>;

const PurchaseOrderLineErrorContext = createContext<UsePurchaseOrderLineErrors>(
  {} as any
);

export const usePurchaseOrderLineErrorContext = () => {
  const context = useContext(PurchaseOrderLineErrorContext);

  if (!context) throw new Error('Context does not exist');

  return context;
};

export const PurchaseOrderLineErrorProvider: React.FC<
  PropsWithChildrenOnly
> = ({ children }) => {
  const state = usePurchaseOrderLineErrors();

  return (
    <PurchaseOrderLineErrorContext.Provider value={state}>
      {children}
    </PurchaseOrderLineErrorContext.Provider>
  );
};
