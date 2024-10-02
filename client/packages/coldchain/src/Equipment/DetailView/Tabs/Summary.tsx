import React from 'react';
import {
  AutocompleteMulti,
  BasicTextInput,
  Checkbox,
  DateTimePickerInput,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import {
  ArrayUtils,
  Box,
  Formatter,
  UNDEFINED_STRING_VALUE,
  useAuthContext,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { Status } from '../../Components';
import {
  DonorSearchInput,
  NameRowFragment,
  StoreRowFragment,
  StoreSearchInput,
} from '@openmsupply-client/system';
import { DraftAsset } from '../../types';
interface SummaryProps {
  draft?: DraftAsset;
  onChange: (patch: Partial<DraftAsset>) => void;
  locations: {
    label: string;
    value: string;
  }[];
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

export const Summary = ({ draft, onChange, locations }: SummaryProps) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const { storeId } = useAuthContext();
  const isCentralServer = useIsCentralServerApi();

  if (!draft) return null;

  const defaultLocations = draft.locations.nodes.map(location => ({
    label: location.code,
    value: location.id,
  }));

  const onStoreChange = (store: StoreRowFragment) => {
    onChange({
      store: {
        __typename: 'StoreNode',
        id: store.id,
        code: store.code ?? '',
        storeName: store.storeName,
      },
    });
  };

  const onStoreInputChange = (
    _event: React.SyntheticEvent<Element, Event>,
    _value: string,
    reason: string
  ) => {
    if (reason === 'clear') onChange({ store: null });
  };

  const onDonorInputChange = (
    _event: React.SyntheticEvent<Element, Event>,
    _value: string,
    reason: string
  ) => {
    if (reason === 'clear') onChange({ donor: null, donorNameId: null });
  };

  return (
    <Box display="flex" flex={1}>
      <Container>
        <Section heading={t('heading.asset-identification')}>
          {isCentralServer && (
            <Row label={t('label.store')}>
              <StoreSearchInput
                clearable
                fullWidth
                value={draft?.store ?? undefined}
                onChange={onStoreChange}
                onInputChange={onStoreInputChange}
              />
            </Row>
          )}
          <Row label={t('label.category')}>
            <BasicTextInput
              value={draft.assetCategory?.name ?? ''}
              disabled
              fullWidth
            />
          </Row>
          <Row label={t('label.type')}>
            <BasicTextInput
              value={draft.assetType?.name ?? ''}
              disabled
              fullWidth
            />
          </Row>
          <Row label={t('label.serial')}>
            <BasicTextInput
              value={draft.serialNumber ?? ''}
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
          <Row label={t('label.warranty-start-date')}>
            <DateTimePickerInput
              value={DateUtils.getDateOrNull(draft.warrantyStart)}
              format="P"
              onChange={date =>
                onChange({ warrantyStart: Formatter.naiveDate(date) })
              }
              textFieldProps={{ fullWidth: true }}
            />
          </Row>
          <Row label={t('label.warranty-end-date')}>
            <DateTimePickerInput
              value={DateUtils.getDateOrNull(draft.warrantyEnd)}
              format="P"
              onChange={date =>
                onChange({ warrantyEnd: Formatter.naiveDate(date) })
              }
              textFieldProps={{ fullWidth: true }}
            />
          </Row>
        </Section>
        {(!isCentralServer || draft.storeId == storeId) && (
          <Section heading={t('heading.cold-chain')}>
            <Row label={t('label.cold-storage-location')}>
              {locations ? (
                <AutocompleteMulti
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                  defaultValue={defaultLocations}
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
                    onChange({
                      locationIds: ArrayUtils.dedupe(
                        newSelectedLocations.map(location => location.value)
                      ),
                    });
                  }}
                  options={locations}
                />
              ) : null}
            </Row>
          </Section>
        )}
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
            <Box display="flex">
              <Status status={draft.statusLog?.status} />
            </Box>
          </Row>
          <Row label={t('label.last-updated')}>
            <BasicTextInput
              value={localisedDate(draft.statusLog?.logDatetime)}
              disabled
              fullWidth
            />
          </Row>
          <Row label={t('label.reason')}>
            <BasicTextInput
              value={draft.statusLog?.reason?.reason ?? UNDEFINED_STRING_VALUE}
              disabled
              fullWidth
            />
          </Row>
          <Row label={t('label.needs-replacement')}>
            <Checkbox
              checked={Boolean(draft.needsReplacement)}
              onChange={e => onChange({ needsReplacement: e.target.checked })}
            />
          </Row>
        </Section>
        <Section heading={t('label.additional-info')}>
          <Row label={t('label.notes')}>
            <BasicTextInput
              value={draft.notes ?? ''}
              onChange={e => onChange({ notes: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />
          </Row>
        </Section>
        <Section heading={t('label.donor')}>
          <Row label={t('label.donor')}>
            <DonorSearchInput
              value={draft.donor as NameRowFragment} // Using as NameRowFragment is ok, because the comparison function is based on the id
              onChange={e => onChange({ donor: e, donorNameId: e?.id })}
              onInputChange={onDonorInputChange}
              clearable
            />
          </Row>
        </Section>
      </Container>
    </Box>
  );
};
