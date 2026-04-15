import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { LineLinkedToTransferredInvoiceErrorFragment } from '../api';

export type InboundShipmentLineError =
  LineLinkedToTransferredInvoiceErrorFragment;

const useInboundShipmentLineErrors = () => {
  const [errors, setErrors] = useState<{
    [InboundShipmentLineId: string]: InboundShipmentLineError | undefined;
  }>({});

  const getError = useCallback(
    ({ id }: RecordWithId): InboundShipmentLineError | undefined => {
      return errors[id];
    },
    [errors]
  );

  const setError = useCallback(
    (id: string, error: InboundShipmentLineError) => {
      setErrors(errors => ({ ...errors, [id]: error }));
    },
    []
  );

  const unsetError = useCallback((id: string) => {
    setErrors(errors => ({ ...errors, [id]: undefined }));
  }, []);

  const unsetAll = useCallback(() => {
    setErrors({});
  }, []);

  return useMemo(
    () => ({ errors, setError, setErrors, getError, unsetError, unsetAll }),
    [errors, setError, setErrors, getError, unsetError, unsetAll]
  );
};

export type UseInboundShipmentLineErrors = ReturnType<
  typeof useInboundShipmentLineErrors
>;

const InboundShipmentLineErrorContext =
  createContext<UseInboundShipmentLineErrors>({} as any);

export const useInboundShipmentLineErrorContext = () => {
  const context = useContext(InboundShipmentLineErrorContext);

  if (!context) throw new Error('Context does not exist');

  return context;
};

export const InboundShipmentLineErrorProvider: React.FC<
  PropsWithChildrenOnly
> = ({ children }) => {
  const state = useInboundShipmentLineErrors();

  return (
    <InboundShipmentLineErrorContext.Provider value={state}>
      {children}
    </InboundShipmentLineErrorContext.Provider>
  );
};
