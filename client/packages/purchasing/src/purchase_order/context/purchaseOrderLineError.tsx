import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { ItemCannotBeOrderedFragment } from '../api';

export type PurchaseOrderLineError = ItemCannotBeOrderedFragment;

const usePurchaseOrderLineErrors = () => {
  const [errors, setErrors] = useState<{
    [purchaseOrderLineId: string]: PurchaseOrderLineError | undefined;
  }>({});

  const getError = useCallback(
    ({ id }: RecordWithId): PurchaseOrderLineError | undefined => {
      return errors[id];
    },
    [errors]
  );

  const setError = useCallback(
    (id: string, error: PurchaseOrderLineError) => {
      setErrors(prev => ({ ...prev, [id]: error }));
    },
    []
  );

  const unsetError = useCallback((id: string) => {
    setErrors(prev => ({ ...prev, [id]: undefined }));
  }, []);

  const unsetAll = useCallback(() => {
    setErrors({});
  }, []);

  return useMemo(
    () => ({ errors, setError, setErrors, getError, unsetError, unsetAll }),
    [errors, setError, setErrors, getError, unsetError, unsetAll]
  );
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
