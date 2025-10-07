import React from 'react';
import {
  AppBarContentPortal,
  Grid,
  useTranslation,
  BufferedTextInput,
  useBufferState,
  InputWithLabelRow,
  Alert,
  useSimplifiedTabletUI,
  TypedTFunction,
  LocaleKey,
  FieldUpdateMutation,
} from '@openmsupply-client/common';
import { StocktakeFragment, useStocktakeOld } from '../api';

export const Toolbar = () => {
  const isDisabled = useStocktakeOld.utils.isDisabled();
  const t = useTranslation();
  const { isLocked, description, update } = useStocktakeOld.document.fields([
    'isLocked',
    'description',
  ]);
  const simplifiedTabletView = useSimplifiedTabletUI();
  const [descriptionBuffer, setDescriptionBuffer] = useBufferState(description);

  const infoMessage = isLocked
    ? t('messages.on-hold-stock-take')
    : t('messages.finalised-stock-take');

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        {simplifiedTabletView ? (
          <Grid display="flex" flex={1} flexDirection="row" gap={1}>
            <InformationFields
              isDisabled={isDisabled}
              descriptionBuffer={descriptionBuffer}
              setDescriptionBuffer={setDescriptionBuffer}
              update={update}
              t={t}
              infoMessage={infoMessage}
            />
          </Grid>
        ) : (
          <Grid display="flex" flex={1} flexDirection="column" gap={1}>
            <InformationFields
              isDisabled={isDisabled}
              descriptionBuffer={descriptionBuffer}
              setDescriptionBuffer={setDescriptionBuffer}
              update={update}
              t={t}
              infoMessage={infoMessage}
            />
          </Grid>
        )}
      </Grid>
    </AppBarContentPortal>
  );
};

const InformationFields = ({
  isDisabled,
  descriptionBuffer,
  setDescriptionBuffer,
  update,
  t,
  infoMessage,
}: {
  isDisabled: boolean;
  descriptionBuffer: string | null | undefined;
  setDescriptionBuffer: (value: string) => void;
  update: FieldUpdateMutation<StocktakeFragment>;
  t: TypedTFunction<LocaleKey>;
  infoMessage: string;
}) => {
  return (
    <>
      <InputWithLabelRow
        label={t('heading.description')}
        Input={
          <BufferedTextInput
            disabled={isDisabled}
            size="small"
            sx={{ width: 250 }}
            value={descriptionBuffer ?? ''}
            onChange={event => {
              setDescriptionBuffer(event.target.value);
              update({ description: event.target.value });
            }}
          />
        }
      />
      {isDisabled && <Alert severity="info">{infoMessage}</Alert>}
    </>
  );
};
