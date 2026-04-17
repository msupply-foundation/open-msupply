import React, { createContext, useContext, useState } from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { RequisitionReasonNotProvidedErrorFragment } from '../api';

export type RequestRequisitionLineError =
  RequisitionReasonNotProvidedErrorFragment;

const useRequestRequisitionLineErrors = () => {
  const [errors, setErrors] = useState<{
    [RequestRequisitionLineId: string]: RequestRequisitionLineError | undefined;
  }>({});

  const getError = ({
    id,
  }: RecordWithId): RequestRequisitionLineError | undefined => {
    return errors[id];
  };

  const setError = (id: string, error: RequestRequisitionLineError) => {
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
