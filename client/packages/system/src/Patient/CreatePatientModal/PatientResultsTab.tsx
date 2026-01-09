import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BasicSpinner,
  Box,
  DownloadIcon,
  GenderTypeNode,
  HomeIcon,
  InfoTooltipIcon,
  LoadingButton,
  noOtherVariants,
  useTranslation,
  getGenderTranslationKey,
  Alert,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';
import { FetchPatientModal } from './FetchPatientModal';
import { usePatient } from '../api';
import { CentralPatientSearchResponse } from '../api/api';
import { Gender, usePatientStore } from '@openmsupply-client/programs';

const genderToGenderType = (gender: Gender): GenderTypeNode => {
  switch (gender) {
    case Gender.MALE:
      return GenderTypeNode.Male;
    case Gender.FEMALE:
      return GenderTypeNode.Female;
    case Gender.TRANSGENDER_MALE:
      return GenderTypeNode.TransgenderMale;
    case Gender.TRANSGENDER_FEMALE:
      return GenderTypeNode.TransgenderFemale;
    case Gender.UNKNOWN:
      return GenderTypeNode.Unknown;
    case Gender.NON_BINARY:
      return GenderTypeNode.NonBinary;
    case Gender.TRANSGENDER:
      return GenderTypeNode.Transgender;
    default:
      return noOtherVariants(gender);
  }
};

export interface PatientColumnData {
  id: string;
  code?: string | null;
  code2?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: GenderTypeNode | null;
  isDeceased?: boolean | null;
  isOnCentral?: boolean;
}

const isConnectionError = (
  centralSearchData: CentralPatientSearchResponse | undefined
): boolean => {
  if (centralSearchData?.__typename === 'CentralPatientSearchError') {
    switch (centralSearchData.error.__typename) {
      case 'ConnectionError': {
        return true;
      }
      default:
        noOtherVariants(centralSearchData.error.__typename);
    }
  }
  return false;
};

export const PatientResultsTab: FC<
  PatientPanel & {
    active: boolean;
    onRowClick: (selectedPatient: PatientColumnData) => void;
  }
> = ({ patient, value, active, onRowClick }) => {
  const t = useTranslation();
  const { setCreateNewPatient } = usePatientStore();

  const [data, setData] = useState<PatientColumnData[]>([]);
  const [fetchingPatient, setFetchingPatient] = useState<
    PatientColumnData | undefined
  >(undefined);
  const searchEnabled = !!patient && active;
  const {
    isLoading: isLoadingLocal,
    data: localSearchData,
    mutate: search,
  } = usePatient.utils.search();
  const {
    isFetching: isLoadingCentral,
    data: centralSearchData,
    refetch: centralRefetch,
  } = usePatient.utils.centralSearch(
    {
      code: patient?.code,
      firstName: patient?.firstName,
      lastName: patient?.lastName,
      dateOfBirth: patient?.dateOfBirth,
    },
    searchEnabled
  );
  const isCentralConnectionFailure =
    !isLoadingCentral && isConnectionError(centralSearchData);

  const searchParams = useMemo(
    () => ({
      code: patient?.code,
      code2: patient?.code2,
      firstName: patient?.firstName,
      lastName: patient?.lastName,
      dateOfBirth: patient?.dateOfBirth,
      gender: patient?.gender ? genderToGenderType(patient?.gender) : undefined,
    }),
    [patient]
  );

  const count = data?.length ?? 0;

  useEffect(() => {
    if (Object.values(searchParams).every(it => it === undefined)) return;
    search(searchParams);
  }, [search, searchParams]);

  useEffect(() => {
    const patients: PatientColumnData[] = [];
    if (localSearchData) {
      patients.push(...localSearchData.nodes.map(node => node.patient));
    }
    if (
      centralSearchData &&
      centralSearchData.__typename === 'CentralPatientSearchConnector'
    ) {
      for (const node of centralSearchData.nodes) {
        if (patients.find(p => p.id === node.id) === undefined) {
          patients.push({ ...node, isOnCentral: true });
        }
      }
    }
    setData(patients);
  }, [localSearchData, centralSearchData]);

  const onClose = useCallback(() => {
    // refresh local list so that patient shows up to be in the current store
    search(searchParams);
    setFetchingPatient(undefined);
  }, [search, searchParams]);

  const handleRowClick = async (row: PatientColumnData): Promise<void> => {
    if (row.isOnCentral) {
      setFetchingPatient(row);
      return;
    }
    setCreateNewPatient(undefined);
    onRowClick(row);
  };

  const columns = useMemo(
    (): ColumnDef<PatientColumnData>[] => [
      {
        accessorKey: 'code',
        header: t('label.patient-id'),
        size: 100,
      },
      {
        accessorKey: 'code2',
        header: t('label.patient-nuic'),
        size: 100,
      },
      {
        accessorKey: 'firstName',
        header: t('label.first-name'),
      },
      {
        accessorKey: 'lastName',
        header: t('label.last-name'),
      },
      {
        accessorKey: 'dateOfBirth',
        header: t('label.date-of-birth'),
        columnType: ColumnType.Date,
        size: 100,
      },
      {
        id: 'gender',
        accessorFn: row => row.gender ? t(getGenderTranslationKey(row.gender)) : '',
        header: t('label.gender'),
      },
      {
        accessorKey: 'isDeceased',
        header: t('label.deceased'),
        columnType: ColumnType.Boolean,
        size: 80,
      },
      {
        id: 'isOnCentral',
        header: '',
        Cell: ({ row: { original: row } }) => {
          return row.isOnCentral ? <DownloadIcon /> : <HomeIcon />;
        },
      },
    ],
    []
  );

  const table = useSimpleMaterialTable<PatientColumnData>({
    tableId: 'create-patient-search-results',
    data,
    columns,
    onRowClick: handleRowClick,
    noDataElement: t('messages.no-matching-patients'),
  });

  if (!active) {
    return null;
  }

  if (isLoadingLocal) {
    return <BasicSpinner />;
  }

  return (
    <PatientPanel value={value} patient={patient}>
      {fetchingPatient ? (
        <FetchPatientModal
          patient={fetchingPatient}
          onClose={onClose}
          onDownload={onRowClick}
        />
      ) : null}
      <>
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          marginBottom={0.5}
        >
          {count > 0 && (
            <Alert severity="success">
              {t('messages.patients-found', { count })}
            </Alert>
          )}
          <Box display="flex" flexDirection="row" marginLeft="auto">
            {isCentralConnectionFailure ? (
              <InfoTooltipIcon title={t('messages.failed-to-reach-central')} />
            ) : null}
            {isLoadingCentral || isCentralConnectionFailure ? (
              <LoadingButton
                size="small"
                color="secondary"
                onClick={() => centralRefetch()}
                isLoading={isLoadingCentral}
                variant="outlined"
                label={t('button.retry')}
              />
            ) : null}
          </Box>
        </Box>
      </>

      <Alert severity="info" style={{ marginBottom: 2 }}>
        {t('messages.patients-create', { count })}
      </Alert>
      <MaterialTable table={table} />
    </PatientPanel>
  );
};
