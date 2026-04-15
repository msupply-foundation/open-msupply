import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { RequisitionReasonNotProvidedErrorFragment } from '../api';

export type RequestRequisitionLineError =
  RequisitionReasonNotProvidedErrorFragment;

const useRequestRequisitionLineErrors = () => {
  const [errors, setErrors] = useState<{
    [RequestRequisitionLineId: string]: RequestRequisitionLineError | undefined;
  }>({});

  const getError = useCallback(
    ({
      id,
    }: RecordWithId): RequestRequisitionLineError | undefined => {
      return errors[id];
    },
    [errors]
  );

  const setError = useCallback(
    (id: string, error: RequestRequisitionLineError) => {
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

export type UseRequestRequisitionLineErrors = ReturnType<
  typeof useRequestRequisitionLineErrors
>;

const RequestRequisitionLineErrorContext =
  createContext<UseRequestRequisitionLineErrors>({} as any);

export const useRequestRequisitionLineErrorContext = () => {
  const context = useContext(RequestRequisitionLineErrorContext);

  if (!context) throw new Error('Context does not exist');

  return context;
};

export const RequestRequisitionLineErrorProvider: React.FC<
  PropsWithChildrenOnly
> = ({ children }) => {
  const state = useRequestRequisitionLineErrors();

  return (
    <RequestRequisitionLineErrorContext.Provider value={state}>
      {children}
    </RequestRequisitionLineErrorContext.Provider>
  );
};
