import { type Component } from 'solid-js';
import { t } from '@/intl';
import { graphqlFetch } from '@/api/graphql';
import { ListExportAction } from '@/domain/reportFiles/ListExportAction';
import { stripEmpty } from '@/typeHelpers';
import { Patients, type PatientsVariables } from '../patients.generated';
import type { PatientFilter } from '../listFilters';
import { patientsToCsv } from '../patientsToCsv';

// The patient list Export action (spec/patients S1 "Export CSV"): the shared
// CSV/Excel split button, fed this vertical's query. Exports EVERY patient
// matching the current filter, not just the page. Delivery, the busy state and
// the outcome report live in ListExportAction — this file owns only the query.

export interface ExportPatientsActionProps {
  storeId: string;
  /** The list's current filter — the export matches it (all pages). */
  filter: () => PatientFilter;
}

export const ExportPatientsAction: Component<
  ExportPatientsActionProps
> = props => {
  const buildCsv = async (): Promise<string | null> => {
    const variables: PatientsVariables = {
      storeId: props.storeId,
      filter: stripEmpty(props.filter()),
      sort: [{ key: 'createdDatetime', desc: true }],
    };
    const result = await graphqlFetch(Patients, variables);
    if (result.kind !== 'success') return null;
    const nodes = result.data.patients.nodes;
    return nodes.length ? patientsToCsv(nodes) : null;
  };

  return (
    <ListExportAction
      storeId={props.storeId}
      buildCsv={buildCsv}
      listName={t('filename.patients')}
    />
  );
};
