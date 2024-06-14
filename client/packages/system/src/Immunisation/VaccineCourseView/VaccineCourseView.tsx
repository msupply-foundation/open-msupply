import {
  ArrayUtils,
  Autocomplete,
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
import { useDemographicIndicators } from '../../IndicatorsDemographics/api/hooks/document/useDemographicIndicators';
import { VaccineItemSelect } from '../../Item';

const MAXVACCINEDOSES = 20;

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

export const VaccineCourseView: FC = () => {
  const { setSuffix, navigateUpOne } = useBreadcrumbs();
  const t = useTranslation('coldchain');
  const { id } = useParams();
  const {
    draft,
    update: { update },
    updatePatch,
    query: { data, isLoading },
    isDirty,
  } = useVaccineCourse(id);
  const { data: demographicData } = useDemographicIndicators();

  const [doseCount, setDoseCount] = useState(draft?.doses ?? 1);

  const defaultRow: VaccineCourseScheduleNode = {
    doseNumber: 1,
    id: FnUtils.generateUUID(),
    label: t('label.new-row'),
    __typename: 'VaccineCourseScheduleNode',
  };

  const tryUpdateValue = (value: number | undefined) => {
    if (typeof value !== 'number') {
      return;
    }
    if (value > MAXVACCINEDOSES) {
      return;
    }
    setDoseCount(value);
  };

  const updateSchedule = (value: number) => {
    if (!value) {
      return;
    }
    const scheduleSeed = (number: number): VaccineCourseScheduleNode => {
      return {
        __typename: 'VaccineCourseScheduleNode',
        id: FnUtils.generateUUID(),
        doseNumber: number,
        label: t('label.new-row'),
      };
    };
    let rows = draft?.vaccineCourseSchedules ?? [];

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
    updatePatch({ vaccineCourseSchedules: rows });
  };

  const updateDescription = (patch: RecordPatch<VaccineCourseScheduleNode>) => {
    if (!patch) {
      return;
    }
    const schedule = {
      ...ArrayUtils.toObject(draft.vaccineCourseSchedules ?? [defaultRow]),
      [patch.id]: patch,
    };

    const scheduleArray = Object.values(schedule);
    updatePatch({ vaccineCourseSchedules: scheduleArray });
  };

  const dosesColumns = useColumns<VaccineCourseScheduleNode>(
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
  }, [data?.name, setSuffix]);

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
              defaultValue={{
                label: draft.demographicIndicator?.name ?? '',
                value: draft.demographicIndicator?.id ?? '',
              }}
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
            <VaccineItemSelect draft={draft} onChange={updatePatch} />
          </Row>
          <Row label={t('label.calculate-demand')}>
            <Checkbox
              checked={draft?.isActive ?? true}
              onChange={e => updatePatch({ isActive: e.target.checked })}
            ></Checkbox>
          </Row>
        </Section>
      </Container>
      <Container>
        <Section heading={t('heading.schedule')}>
          <Row label={t('label.number-of-doses')}>
            <NumericTextInput
              value={doseCount}
              fullWidth
              onBlur={e => {
                updatePatch({ doses: parseInt(e.target.value) });
                updateSchedule(parseInt(e.target.value));
              }}
              onChange={tryUpdateValue}
            />
          </Row>
          <Box paddingTop={1.5}>
            <MiniTable
              rows={draft.vaccineCourseSchedules ?? [defaultRow]}
              columns={dosesColumns}
            />
          </Box>
        </Section>
      </Container>
      <AppFooterComponent
        isDirty={isDirty}
        save={update}
        cancel={cancel}
        isLoading={isLoading}
      />
    </Box>
  ) : (
    <NothingHere />
  );
};
