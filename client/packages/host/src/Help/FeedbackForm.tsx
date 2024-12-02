import React from 'react';
import {
  Grid,
  useTranslation,
  TextArea,
  InputWithLabelRow,
  BasicTextInput,
  LoadingButton,
  MailIcon,
  useNotification,
} from '@openmsupply-client/common';
import { useFeedbackForm } from '../api/hooks/help/useFeedbackForm';

export const FeedbackForm = () => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { updateDraft, resetDraft, draft } = useFeedbackForm();

  // save input email address and message to email queue on server
  const save = async () => {
    try {
      // TODO: Call create() to create new mutation
      const successSnack = success(t('messages.message-sent'));
      successSnack();
      resetDraft();
    } catch {
      const errorSnack = error(t('messages.message-not-sent'));
      errorSnack();
    }
  };

  return (
    <>
      <InputWithLabelRow
        label={t('label.your-email-address')}
        labelWidth="200"
        Input={
          <BasicTextInput
            value={draft.email}
            onChange={e => updateDraft({ email: e.target.value })}
            fullWidth
          />
        }
      />
      <InputWithLabelRow
        label={t('label.message')}
        labelWidth="200"
        Input={
          <TextArea
            value={draft.message}
            onChange={e => {
              updateDraft({ message: e.target.value });
            }}
            InputProps={{
              sx: {
                backgroundColor: theme => theme.palette.background.menu,
              },
            }}
            fullWidth
          />
        }
      />
      <Grid item justifyContent="flex-end" width="100%" display="flex">
        <LoadingButton
          isLoading={false}
          startIcon={<MailIcon />}
          type="submit"
          variant="contained"
          sx={{ fontSize: '12px' }}
          disabled={false}
          onClick={save}
        >
          {t('button.send')}
        </LoadingButton>
      </Grid>
    </>
  );
};
