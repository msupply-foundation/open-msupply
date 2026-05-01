import React, { createContext, useContext } from 'react';

const FormIdContext = createContext<string | undefined>(undefined);

export const FormIdProvider = ({
  formId,
  children,
}: {
  formId: string;
  children: React.ReactNode;
}) => (
  <FormIdContext.Provider value={formId}>{children}</FormIdContext.Provider>
);

export const useFormId = (explicit?: string): string | undefined => {
  const fromContext = useContext(FormIdContext);
  return explicit ?? fromContext;
};
