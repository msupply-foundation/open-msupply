import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BasicSpinner,
  Box,
  ColumnAlign,
  DataTable,
  DotCell,
  DownloadIcon,
  FnUtils,
  GenderType,
  HomeIcon,
  InfoTooltipIcon,
  LoadingButton,
  Typography,
  noOtherVariants,
  useColumns,
  useFormatDateTime,
  useLocation,
  useNavigate,
  useTranslation,
  getGenderTranslationKey,
} from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';
import { FetchPatientModal } from './FetchPatientModal';
import { usePatient } from '../api';
import { CentralPatientSearchResponse } from '../api/api';
import { AppRoute } from '@openmsupply-client/config';
import { Gender, usePatientStore } from '@openmsupply-client/programs';
import { usePrescription } from '@openmsupply-client/invoices/src/Prescriptions';

const genderToGenderType = (gender: Gender): GenderType => {
  switch (gender) {
    case Gender.MALE:
      return GenderType.Male;
    case Gender.FEMALE:
      return GenderType.Female;
    case Gender.TRANSGENDER_MALE:
      return GenderType.TransgenderMale;
    case Gender.TRANSGENDER_FEMALE:
      return GenderType.TransgenderFemale;
    case Gender.UNKNOWN:
      return GenderType.Unknown;
    case Gender.NON_BINARY:
      return GenderType.NonBinary;
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
      gender: patient?.gender ? genderToGenderType(patient?.gender) : undefined,
    }),
    [patient]
  );

  const { setCreateNewPatient } = usePatientStore();
  const t = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { localisedDate } = useFormatDateTime();
  const {
    create: { create: createPrescription },
  } = usePrescription();

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
      formatter: gender => t(getGenderTranslationKey(gender as GenderType)),
    },
    {
      key: 'isDeceased',
      label: 'label.deceased',
      align: ColumnAlign.Center,
      Cell: DotCell,
      sortable: false,
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

  const handleRowClick = async (row: PatientColumnData): Promise<void> => {
    const urlSegments = location.pathname.split('/');

    if (row.isOnCentral) {
      setFetchingPatient(row);
      return;
    }

    setCreateNewPatient(undefined);

    if (urlSegments.includes(AppRoute.Prescription)) {
      const invoice = await createPrescription({
        id: FnUtils.generateUUID(),
        patientId: String(row.id),
      });
      navigate(invoice.id ?? '');
      return;
    }

    navigate(String(row.id));
  };

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
                label={t('button.retry')}
              />
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
        onRowClick={handleRowClick}
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
