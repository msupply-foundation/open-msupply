import {
  ArrayUtils,
  Autocomplete,
  AutocompleteMulti,
  BasicSpinner,
  BasicTextInput,
  Box,
  Checkbox,
  Container,
  DemographicIndicatorNode,
  FnUtils,
  InputWithLabelRow,
  MiniTable,
  NothingHere,
  NumericTextInput,
  RecordPatch,
  Typography,
  VaccineCourseScheduleNode,
  useBreadcrumbs,
  useColumns,
  useParams,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useEffect, useMemo, useState } from 'react';
import { FC } from 'react';
import { descriptionColumn } from './DescriptionColumn';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { AppFooterComponent } from './AppFooterComponent';
import { isDirty } from 'zod';
import { useDemographicIndicators } from '../../IndicatorsDemographics/api/hooks/document/useDemographicIndicators';

const getDemographicOptions = (
  demographicIndicators: DemographicIndicatorNode[]
) => {
  const options = demographicIndicators.map(indicator => {
    return {
      value: indicator.id,
      label: `${indicator.name} ${indicator.baseYear}`,
    };
  });
  return options;
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

// TODO replace with item querr
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

export const VaccineCourseView: FC = () => {
  const { setSuffix, navigateUpOne } = useBreadcrumbs();
  const t = useTranslation('coldchain');
  const { id } = useParams();
  const {
    draft,
    update: { update, isUpdating, updateError },
    updatePatch,
    errorMessage,
    query: { data, isLoading, error },
  } = useVaccineCourse(id);
  const { data: demographicData } = useDemographicIndicators();
  const [buffer, setBuffer] = useState(draft?.doses ?? 1);
  const [value, setValue] = useState(draft?.doses ?? 1);

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

  // TODO add placeholder and refactor
  const updateSchedule = (value: number) => {
    if (!value) {
      return;
    }
    const scheduleSeed = (number: number) => {
      return {
        id: FnUtils.generateUUID(),
        number: number,
        description: '',
        day: 0,
      };
    };
    let rows = Object.values(draft?.vaccineCourseSchedules) as Schedule[];

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

    const rowsAsObject = ArrayUtils.toObject(rows);
    updatePatch({ vaccineCourseSchedules: rowsAsObject });
  };

  const updateDescription = (patch: RecordPatch<VaccineCourseScheduleNode>) => {
    if (!patch) {
      return;
    }
    const schedule = { ...draft.vaccineCourseSchedules, [patch.id]: patch };
    updatePatch({ vaccineCourseSchedules: schedule });
  };

  const dosesColumns = useColumns(
    [
      { key: 'doseNumber', label: 'label.dose-number' },
      [descriptionColumn(), { setter: updateDescription }],
    ],
    {},
    [draft]
  );

  const cancel = () => {
    navigateUpOne();
  };

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix]);

  const options = useMemo(
    () => getDemographicOptions(demographicData?.nodes ?? []),
    [demographicData]
  );

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
              onChange={e => updatePatch({ name: e.target.value })}
            />
          </Row>
          <Row label={t('label.target-demographic')}>
            <Autocomplete
              isOptionEqualToValue={option =>
                option?.value === draft.demographicIndicatorId
              }
              onChange={(_e, selected) =>
                updatePatch({ demographicIndicatorId: selected?.value })
              }
              placeholder={'demographic'}
              options={options}
            />
          </Row>
          <Row label={t('label.coverage-rate')}>
            <NumericTextInput
              value={draft?.coverageRate ?? 1}
              fullWidth
              onChange={value => updatePatch({ coverageRate: value })}
            />
          </Row>
          <Row label={t('label.wastage-rate')}>
            <NumericTextInput
              value={draft?.wastageRate ?? 1}
              fullWidth
              onChange={value => updatePatch({ wastageRate: value })}
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
                updatePatch({
                  vaccineItems: ArrayUtils.dedupe(
                    newSelectedLocations.map(item => item.value)
                  ),
                });
              }}
              options={VaccineOptions}
            />
          </Row>
          <Row label={t('label.calculate-demand')}>
            <Checkbox
              value={draft?.calculateDemand ?? true}
              onChange={value => updatePatch({ calculateDemand: value })}
            ></Checkbox>
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
                updatePatch({ doses: value });
                updateSchedule(value);
              }}
              onChange={tryUpdateValue}
            />
          </Row>
          <Box paddingTop={1.5}>
            <MiniTable
              rows={draft?.vaccineCourseSchedules ?? []}
              columns={dosesColumns}
              // sx={{ backgroundColour: 'blue' }}
            />
          </Box>
        </Section>
      </Container>
      <AppFooterComponent isDirty={isDirty} save={update} cancel={cancel} />
    </Box>
  ) : (
    <NothingHere />
  );
};
