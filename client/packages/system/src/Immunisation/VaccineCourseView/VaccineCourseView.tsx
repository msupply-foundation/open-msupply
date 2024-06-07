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

export const VaccineCourseView: FC = () => {
  const { setSuffix } = useBreadcrumbs();
  const t = useTranslation('coldchain');
  const { draft, onUpdate, isLoading } = useDraftProgram();
  const [buffer, setBuffer] = useState(draft?.numberOfDoses ?? 1);
  const [value, setValue] = useState(draft?.numberOfDoses ?? 1);

  const tryUpdateValue = (value: number | undefined) => {
    if (value === undefined) return;
    const isValid = Number.isInteger(value) && value >= 0 && value <= 10;

    if (isValid) {
      setValue(value);
      // setError(false);
      // } else {
      //   setError(true);
      // }
    }
    setBuffer(value);
  };
  const updateSchedule = (value: number | undefined) => {
    if (!value) {
      return;
    }
    const scheduleSeed = (number: number) => {
      return {
        number: number,
        day: 0,
      };
    };

    let rows = draft?.schedule;
    if (rows.length === value) {
      return;
    } else if (value > rows.length) {
      let toAdd = value - rows.length;
      while (toAdd > 0) {
        const number = value - toAdd + 1;
        rows.push(scheduleSeed(number));
        toAdd--;
      }
    } else {
      rows = rows.slice(0, value);
    }
    onUpdate({ schedule: rows });
  };

  const dosesColumns = useColumns(
    [
      { key: 'number', label: 'label.dose-number' },
      { key: 'day', label: 'label.day' },
    ],
    {},
    [draft]
  );

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
            <NumericTextInput
              value={draft?.coverageRate ?? 1}
              fullWidth
              onChange={value => onUpdate({ coverageRate: value })}
            />
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
            <NumericTextInput
              value={buffer}
              fullWidth
              onBlur={() => {
                onUpdate({ numberOfDoses: value });
                updateSchedule(value);
              }}
              onChange={tryUpdateValue}
            />
          </Row>
          <Box paddingTop={1.5}>
            <MiniTable rows={draft?.schedule} columns={dosesColumns} />
          </Box>
        </Section>
      </Container>
    </Box>
  ) : (
    <NothingHere />
  );
};
