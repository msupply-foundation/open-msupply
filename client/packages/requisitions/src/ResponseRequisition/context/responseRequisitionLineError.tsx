import React, { createContext, useContext, useState } from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { RequisitionReasonNotProvidedErrorFragment } from '../../RequestRequisition/api';

export type ResponseRequisitionLineError =
  RequisitionReasonNotProvidedErrorFragment;

const useResponseRequisitionLineErrors = () => {
  const [errors, setErrors] = useState<{
    [ResponseRequisitionLineId: string]:
      | ResponseRequisitionLineError
      | undefined;
  }>({});

  const getError = ({
    id,
  }: RecordWithId): ResponseRequisitionLineError | undefined => {
    return errors[id];
  };

  const setError = (id: string, error: ResponseRequisitionLineError) => {
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

export type UseResponseRequisitionLineErrors = ReturnType<
  typeof useResponseRequisitionLineErrors
>;

const ResponseRequisitionLineErrorContext =
  createContext<UseResponseRequisitionLineErrors>({} as any);

export const useResponseRequisitionLineErrorContext = () => {
  const context = useContext(ResponseRequisitionLineErrorContext);

  if (!context) throw new Error('Context does not exist');

  return context;
};

export const ResponseRequisitionLineErrorProvider: React.FC<
  PropsWithChildrenOnly
> = ({ children }) => {
  const state = useResponseRequisitionLineErrors();

  return (
    <ResponseRequisitionLineErrorContext.Provider value={state}>
      {children}
    </ResponseRequisitionLineErrorContext.Provider>
  );
};
