import { useCallback, useMemo } from 'react';
import {
  ColumnDef,
  EncounterNodeStatus,
  DocumentRegistryCategoryNode,
  ChipTableCell,
  ColumnType,
  useTranslation,
} from '@openmsupply-client/common';
import {
  EncounterRowFragment,
  getStatusEventData,
  useDocumentRegistry,
} from '@openmsupply-client/programs';
import { encounterStatusTranslation, getLogicalStatus } from '../utils';

interface useEncounterListColumnsProps {
  includePatient?: boolean;
}

const useEncounterAdditionalInfoAccessor = () => {
  const t = useTranslation();
  return useCallback((row: EncounterRowFragment): string[] => {
    const additionalInfo = getStatusEventData(row.activeProgramEvents.nodes);

    if (row?.status === EncounterNodeStatus.Pending) {
      const startDatetime = new Date(row?.startDatetime);
      const status = getLogicalStatus(startDatetime, t);
      if (status) {
        additionalInfo.push(status);
      }
    }

    return additionalInfo;
  }, []);
};

export const useEncounterListColumns = ({
  includePatient = false,
}: useEncounterListColumnsProps) => {
  const t = useTranslation();
  const { data: enrolmentRegistries } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: {
          equalTo: DocumentRegistryCategoryNode.ProgramEnrolment,
        },
      },
    });

  const additionalInfoAccessor = useEncounterAdditionalInfoAccessor();

  const columns: ColumnDef<EncounterRowFragment>[] = useMemo(
    () => [
      {
        id: 'Type',
        header: t('label.encounter-type'),
        accessorFn: (row: EncounterRowFragment) =>
          row?.document.documentRegistry?.name,
        enableSorting: true,
      },
      {
        id: 'Program',
        header: t('label.program'),
        accessorFn: (row: EncounterRowFragment) =>
          enrolmentRegistries?.nodes.find(it => it.contextId === row.contextId)
            ?.name,
        enableSorting: true,
        enableColumnFilter: true,
        // GraphQL uses a different key for filtering than for sorting, so need
        // to specify here
        filterKey: 'programEnrolment.programName',
      },
      {
        accessorKey: 'startDatetime',
        header: t('label.date'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
      },

      {
        id: 'patient.lastName',
        header: t('label.patient'),
        description: t('description.patient-filter-note'),
        accessorFn: (row: EncounterRowFragment) => row?.patient?.name,
        // enableSorting: true, -- not sortable, as only has patientId as sort
        // key
        enableColumnFilter: true,
        includeColumn: includePatient,
      },
      {
        accessorKey: 'status',
        header: t('label.status'),
        size: 175,
        filterVariant: 'select',
        accessorFn: (row: EncounterRowFragment) =>
          row.status ? encounterStatusTranslation(row.status, t) : '',
        filterSelectOptions: Object.values(EncounterNodeStatus).map(status => ({
          value: status,
          label: encounterStatusTranslation(status, t),
        })),
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'events',
        header: t('label.additional-info'),
        accessorFn: (row: EncounterRowFragment) => additionalInfoAccessor(row),
        Cell: ChipTableCell,
        size: 300,
        enableSorting: false,
      },
    ],
    [includePatient, enrolmentRegistries, additionalInfoAccessor]
  );

  return columns;
};
