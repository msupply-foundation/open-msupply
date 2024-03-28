import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BasicSpinner,
  Box,
  DataTable,
  DownloadIcon,
  GenderInput,
  HomeIcon,
  InfoTooltipIcon,
  LoadingButton,
  Typography,
  noOtherVariants,
  useColumns,
  useFormatDateTime,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';
import { FetchPatientModal } from './FetchPatientModal';
import { usePatient } from '../api';
import { Gender, usePatientStore } from '@openmsupply-client/programs';
import { CentralPatientSearchResponse } from '../api/api';

const genderToGenderInput = (gender: Gender): GenderInput => {
  switch (gender) {
    case Gender.MALE:
      return GenderInput.Male;
    case Gender.FEMALE:
      return GenderInput.Female;
    case Gender.TRANSGENDER_MALE:
      return GenderInput.TransgenderMale;
    case Gender.TRANSGENDER_FEMALE:
      return GenderInput.TransgenderFemale;
    case Gender.UNKNOWN:
      return GenderInput.Unknown;
    case Gender.NON_BINARY:
      return GenderInput.NonBinary;
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
  gender?: string | null;
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

export const PatientResultsTab: FC<PatientPanel & { active: boolean }> = ({
  patient,
  value,
  active,
}) => {
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
      gender: patient?.gender
        ? genderToGenderInput(patient?.gender)
        : undefined,
    }),
    [patient]
  );

  const { setCreateNewPatient } = usePatientStore();
  const t = useTranslation('dispensary');
  const navigate = useNavigate();
  const { localisedDate } = useFormatDateTime();

  const columns = useColumns<PatientColumnData>([
    {
      key: 'code',
      label: 'label.patient-id',
    },
    {
      key: 'code2',
      label: 'label.patient-nuic',
    },
    {
      key: 'firstName',
      label: 'label.first-name',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
    },
    {
      key: 'dateOfBirth',
      label: 'label.date-of-birth',
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'gender',
      label: 'label.gender',
    },
    {
      key: 'isDeceased',
      label: 'label.deceased',
    },
    {
      key: 'isOnCentral',
      Cell: ({ rowData }) => {
        return rowData.isOnCentral ? <DownloadIcon /> : <HomeIcon />;
      },
    },
  ]);

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

  if (!active) {
    return null;
  }

  if (isLoadingLocal) {
    return <BasicSpinner />;
  }

  return (
    <PatientPanel value={value} patient={patient}>
      {fetchingPatient ? (
        <FetchPatientModal patient={fetchingPatient} onClose={onClose} />
      ) : null}
      <>
        <Box
          display="flex"
          flexDirection="row"
          justifyContent="space-between"
          marginBottom={0.5}
        >
          {count > 0 && (
            <Typography
              component="div"
              style={{ fontWeight: 700 }}
              alignSelf="center"
            >
              {t('messages.patients-found', { count })}
            </Typography>
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
              >
                {t('button.retry')}
              </LoadingButton>
            ) : null}
          </Box>
        </Box>
      </>

      <Typography component="div" fontSize={12}>
        {t('messages.patients-create', { count })}
      </Typography>
      <DataTable
        dense
        id="create-patient-duplicates"
        data={data}
        columns={columns}
        noDataMessage={t('messages.no-matching-patients')}
        onRowClick={row => {
          if (row.isOnCentral) {
            setFetchingPatient(row);
          } else {
            setCreateNewPatient(undefined);
            navigate(String(row.id));
          }
        }}
        generateRowTooltip={({ firstName, lastName, isOnCentral }) => {
          if (isOnCentral) {
            return t('messages.click-to-fetch');
          } else {
            return t('messages.click-to-view', { firstName, lastName });
          }
        }}
      />
    </PatientPanel>
  );
};
