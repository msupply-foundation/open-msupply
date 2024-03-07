import React from 'react';
import {
  BasicTextInput,
  DateTimePickerInput,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import { DateUtils, useTranslation } from '@common/intl';
import { Box, Formatter } from '@openmsupply-client/common';
import { AssetFragment } from '../../api';

interface SummaryProps {
  draft?: AssetFragment;
  onChange: (patch: Partial<AssetFragment>) => void;
}

const Container = ({ children }: { children: React.ReactNode }) => (
  <Box
    display="flex"
    flex={1}
    flexDirection="column"
    alignContent="center"
    padding={4}
  >
    {children}
  </Box>
);

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
      labelWidth="150px"
      label={label}
      labelProps={{
        sx: { fontSize: '16px', paddingRight: 2, textAlign: 'right' },
      }}
      Input={
        <Box sx={{}} flex={1}>
          {children}
        </Box>
      }
    />
  </Box>
);

export const Summary = ({ draft, onChange }: SummaryProps) => {
  const t = useTranslation('coldchain');

  if (!draft) return null;

  return (
    <Box display="flex" flex={1}>
      <Container>
        <Section heading={t('heading.asset-identification')}>
          <Row label={t('label.category')}>
            <BasicTextInput
              value={draft.catalogueItem?.assetCategory?.name}
              disabled
              fullWidth
            />
          </Row>
          <Row label={t('label.type')}>
            <BasicTextInput
              value={draft.catalogueItem?.assetType?.name}
              disabled
              fullWidth
            />
          </Row>
          <Row label={t('label.serial')}>
            <BasicTextInput
              value={draft.serialNumber}
              fullWidth
              onChange={e => onChange({ serialNumber: e.target.value })}
            />
          </Row>
          <Row label={t('label.installation-date')}>
            <DateTimePickerInput
              value={DateUtils.getDateOrNull(draft.installationDate)}
              format="P"
              onChange={date =>
                onChange({ installationDate: Formatter.naiveDate(date) })
              }
              textFieldProps={{ fullWidth: true }}
            />
          </Row>
          <Row label={t('label.replacement-date')}>
            <DateTimePickerInput
              value={DateUtils.getDateOrNull(draft.replacementDate)}
              format="P"
              onChange={date =>
                onChange({ replacementDate: Formatter.naiveDate(date) })
              }
              textFieldProps={{ fullWidth: true }}
            />
          </Row>
        </Section>
        <Section heading={t('heading.cold-chain')}>
          <Row label={t('label.cold-storage-location')}>
            <BasicTextInput value={''} disabled fullWidth />
          </Row>
        </Section>
      </Container>
      <Box
        marginTop={4}
        marginBottom={4}
        sx={{
          borderColor: 'gray.light',
          borderWidth: 0,
          borderLeftWidth: 1,
          borderStyle: 'solid',
        }}
      ></Box>
      <Container>
        <Section heading={t('heading.functional-status')}>
          <Row label={t('label.current-status')}>
            <BasicTextInput value={''} disabled fullWidth />
          </Row>
          <Row label={t('label.last-updated')}>
            <BasicTextInput value={''} disabled fullWidth />
          </Row>
          <Row label={t('label.reason')}>
            <BasicTextInput value={''} disabled fullWidth />
          </Row>
        </Section>
        <Section heading={t('label.additional-info')}>
          <Row label={t('label.notes')}>
            <BasicTextInput
              value={draft.name}
              onChange={e => onChange({ name: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />
          </Row>
        </Section>
      </Container>
    </Box>
  );
};
