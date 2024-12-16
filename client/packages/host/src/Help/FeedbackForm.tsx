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
  RegexUtils,
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
    debounceValidation,
    emailError,
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

  const isValidEmail = RegexUtils.checkEmailIsValid(draft.replyEmail);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    updateDraft({ replyEmail: email });
    debounceValidation(email);
  };

  return (
    <>
      <InputWithLabelRow
        label={t('label.your-email-address')}
        labelWidth="200"
        Input={
          <BasicTextInput
            value={draft.replyEmail}
            onChange={handleChange}
            fullWidth
            helperText={emailError}
            error={!isValidEmail && draft.replyEmail !== ''}
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
