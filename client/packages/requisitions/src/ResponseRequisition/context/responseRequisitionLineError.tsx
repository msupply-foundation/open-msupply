import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { PropsWithChildrenOnly, RecordWithId } from '@common/types';
import { RequisitionReasonNotProvidedErrorFragment } from '../../RequestRequisition/api';
import { CannotDeleteLineLinkedToShipmentErrorFragment } from '../api';

export type ResponseRequisitionLineError =
  | RequisitionReasonNotProvidedErrorFragment
  | CannotDeleteLineLinkedToShipmentErrorFragment;

const useResponseRequisitionLineErrors = () => {
  const [errors, setErrors] = useState<{
    [ResponseRequisitionLineId: string]:
      | ResponseRequisitionLineError
      | undefined;
  }>({});

  const getError = useCallback(
    ({
      id,
    }: RecordWithId): ResponseRequisitionLineError | undefined => {
      return errors[id];
    },
    [errors]
  );

  const setError = useCallback(
    (id: string, error: ResponseRequisitionLineError) => {
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

export type UseResponseRequisitionLineErrors = ReturnType<
  typeof useResponseRequisitionLineErrors
>;

const ResponseRequisitionLineErrorContext = createContext<
  UseResponseRequisitionLineErrors | undefined
>(undefined);

export const useResponseRequisitionLineErrorContext = () => {
  const context = useContext(ResponseRequisitionLineErrorContext);

  if (!context) {
    throw new Error(
      'useResponseRequisitionLineErrorContext must be used within a ResponseRequisitionLineErrorProvider'
    );
  }

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
