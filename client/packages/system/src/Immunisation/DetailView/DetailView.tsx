import {
  ArrayUtils,
  AutocompleteMulti,
  BasicSpinner,
  BasicTextInput,
  Box,
  Container,
  FnUtils,
  InputWithLabelRow,
  MiniTable,
  NothingHere,
  NumericTextInput,
  SearchBar,
  Typography,
  useBreadcrumbs,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useEffect, useState } from 'react';
import { FC } from 'react';

// dummy data
const data = {
  name: 'some immunisation name',
};

const Section = ({
  children,
  heading,
}: {
  children: React.ReactNode;
  heading: string;
}) => (
  <Box
    display="flex"
    flexDirection="column"
    padding={2}
    paddingRight={4}
    sx={{ maxWidth: '600px', width: '100%' }}
  >
    <Heading>{heading}</Heading>
    {children}
  </Box>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      marginLeft: '158px',
      fontSize: '20px',
      fontWeight: 'bold',
    }}
  >
    {children}
  </Typography>
);

const Row = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <Box paddingTop={1.5}>
    <InputWithLabelRow
      labelWidth="160px"
      label={label}
      labelProps={{
        sx: {
          fontSize: '16px',
          paddingRight: 2,
          textAlign: 'right',
        },
      }}
      Input={
        <Box sx={{}} flex={1}>
          {children}
        </Box>
      }
    />
  </Box>
);

const seed = {
  name: '',
  demographic: '',
  coverageRate: '',
  vaccineItems: [{}],
  numberOfDoses: 1,
  schedule: [
    {
      number: 1,
      day: 1,
    },
  ],
};

const createNewProgram = (seed?: any | null): any => ({
  id: FnUtils.generateUUID(),
  name: '',
  ...seed,
});

interface UseDraftProgramControl {
  draft: any;
  onUpdate: (patch: Partial<any>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

// dummy vaccine items
const VaccineOptions = [
  {
    label: 'vaccine 1',
    value: 'vaccine 1',
  },
  {
    label: 'vaccine 2',
    value: 'vaccine 2',
  },
];

const useDraftProgram = (): UseDraftProgramControl => {
  const [vaccine, setProgram] = useState<any>(() => createNewProgram(seed));

  const onUpdate = (patch: Partial<any>) => {
    setProgram({ ...vaccine, ...patch });
  };

  const onSave = async () => {
    console.info('TODO insert vaccine mutation');
  };

  const isLoading = false;

  return {
    draft: vaccine,
    onUpdate,
    onSave,
    isLoading,
  };
};

export const ImmunisationDetailView: FC = () => {
  const { setSuffix } = useBreadcrumbs();
  const t = useTranslation('coldchain');
  const { draft, onUpdate, isLoading } = useDraftProgram();

  const dosesColumns = useColumns([
    { key: 'number', label: 'label.dose-number' },
    { key: 'day', label: 'label.day' },
  ]);

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix]);

  if (isLoading) {
    return <BasicSpinner />;
  }

  return !!data ? (
    <Box display="flex" flex={1}>
      <Container>
        <Section heading={''}>
          <Row label={t('label.immunisation-name')}>
            <BasicTextInput
              value={draft?.name ?? ''}
              fullWidth
              onChange={e => onUpdate({ name: e.target.value })}
            />
          </Row>
          <Row label={t('label.target-demographic')}>
            <SearchBar
              value={draft?.demographic ?? ''}
              onChange={e => onUpdate({ demographic: e })}
              placeholder={'demographic'}
            />
          </Row>
          <Row label={t('label.coverage-rate')}>
            <NumericTextInput fullWidth />
          </Row>
          <Row label={t('label.vaccine-items')}>
            <AutocompleteMulti
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              filterSelectedOptions
              getOptionLabel={option => option.label}
              inputProps={{ fullWidth: true }}
              onChange={(
                _event,
                newSelectedLocations: {
                  label: string;
                  value: string;
                }[]
              ) => {
                onUpdate({
                  vaccineItems: ArrayUtils.dedupe(
                    newSelectedLocations.map(item => item.value)
                  ),
                });
              }}
              options={VaccineOptions}
            />
          </Row>
        </Section>
      </Container>
      <Container>
        <Section heading={t('heading.schedule')}>
          <Row label={t('label.number-of-doses')}>
            <NumericTextInput fullWidth />
          </Row>
          <Row label={t('label.dose-number')}>
            <MiniTable rows={draft?.schedule} columns={dosesColumns} />
          </Row>
        </Section>
      </Container>
    </Box>
  ) : (
    <NothingHere />
  );
};
