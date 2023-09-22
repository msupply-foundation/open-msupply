import { FilterBy } from '@openmsupply-client/common';
import { Document } from '@openmsupply-client/system/src/Patient/api/hooks/document';

export const usePatientSearchQuery = (searchFilter: FilterBy | undefined) => {
  const { data, error, isLoading } = Document.usePatientFullSearch({
    first: 10,
    offset: 0,
    sortBy: { key: 'lastName', direction: 'asc' },
    filterBy: searchFilter,
  });

  const results =
    // If patient has a full document field, use that since it'll make more data
    // available. Otherwise just use the basic Patient fields
    data?.nodes.map(patient => patient.document?.data ?? patient) ?? [];

  return {
    results,
    isLoading,
    error,
  };
};
