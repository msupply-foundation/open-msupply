import {
  Autocomplete,
  BasicSpinner,
  BasicTextInput,
  Box,
  Checkbox,
  Container,
  DemographicIndicatorNode,
  InputWithLabelRow,
  NothingHere,
  NumericTextInput,
  Typography,
  useBreadcrumbs,
  useParams,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useEffect, useMemo } from 'react';
import { FC } from 'react';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { AppFooterComponent } from './AppFooterComponent';
import { useDemographicIndicators } from '../../IndicatorsDemographics/api/hooks/document/useDemographicIndicators';
import { VaccineItemSelect } from './VaccineCourseItemSelect';

const MAX_VACCINE_DOSES = 20;

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

  const tryUpdateValue = (value: number | undefined) => {
    if (typeof value !== 'number') {
      return;
    }
    updatePatch({ doses: value });
  };

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
        <Section heading={t('heading.vaccine-details')}>
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
          <Row label={t('label.number-of-doses')}>
            <NumericTextInput
              value={draft.doses}
              fullWidth
              onChange={tryUpdateValue}
              max={MAX_VACCINE_DOSES}
            />
          </Row>
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
