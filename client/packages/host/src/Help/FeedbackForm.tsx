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
  const {
    updateDraft,
    resetDraft,
    saveFeedback,
    draft,
    isValidInput,
    checkEmailValidity,
  } = useFeedbackForm();

  const save = async () => {
    try {
      saveFeedback(draft);
      const successSnack = success(t('messages.message-sent'));
      successSnack();
      resetDraft();
    } catch {
      const errorSnack = error(t('messages.message-not-sent'));
      errorSnack();
    }
  };

  const isValidEmail = checkEmailValidity(draft.replyEmail);

  return (
    <>
      <InputWithLabelRow
        label={t('label.your-email-address')}
        labelWidth="200"
        Input={
          <BasicTextInput
            value={draft.replyEmail}
            onChange={e => updateDraft({ replyEmail: e.target.value })}
            // onChange={handleChange}
            fullWidth
            helperText={
              !isValidEmail
                ? 'Please enter a valid email e.g help@example.com'
                : ''
            }
            error={!isValidEmail}
          />
        }
      />
      <InputWithLabelRow
        label={t('label.message')}
        labelWidth="200"
        Input={
          <TextArea
            value={draft.body}
            onChange={e => {
              updateDraft({ body: e.target.value });
            }}
            InputProps={{
              sx: {
                backgroundColor: 'background.menu',
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
          disabled={!isValidInput}
          onClick={save}
        >
          {t('button.send')}
        </LoadingButton>
      </Grid>
    </>
  );
};
