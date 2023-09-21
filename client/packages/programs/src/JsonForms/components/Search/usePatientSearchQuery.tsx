import { FilterBy } from '@openmsupply-client/common';
import { Document } from '@openmsupply-client/system/src/Patient/api/hooks/document';

export const usePatientSearchQuery = (searchFilter: FilterBy | undefined) => {
  const { data, error, isLoading } = Document.usePatientFullSearch({
    first: 10,
    offset: 0,
    sortBy: { key: 'lastName', direction: 'asc' },
    filterBy: searchFilter,
  });

  const results = data?.nodes ?? [];

  return {
    results,
    isLoading,
    error,
  };
};
