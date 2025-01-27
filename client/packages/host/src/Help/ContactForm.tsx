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
  Select,
  ContactFormNodeType,
} from '@openmsupply-client/common';
import { useContactForm } from '../api/hooks/help/useContactForm';

export const ContactForm = () => {
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
  } = useContactForm();

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    updateDraft({ replyEmail: email });
    debounceValidation(email);
  };

  return (
    <>
      <InputWithLabelRow
        label={t('label.reason-for-contacting')}
        labelWidth="200"
        Input={
          <Select
            fullWidth
            value={draft.contactType}
            // `as` not ideal, but needed for TS to accept the value
            // OK to use here as we can guarantee the value will be one of the options
            // (based on values defined in options array below)
            onChange={e =>
              updateDraft({
                contactType: e.target.value as ContactFormNodeType,
              })
            }
            margin="normal"
            options={[
              {
                label: t('label.feedback'),
                value: ContactFormNodeType.Feedback,
              },
              {
                label: t('label.support'),
                value: ContactFormNodeType.Support,
              },
            ]}
          />
        }
      />
      <InputWithLabelRow
        label={t('label.your-email-address')}
        labelWidth="200"
        Input={
          <BasicTextInput
            value={draft.replyEmail}
            onChange={handleChange}
            fullWidth
            helperText={emailError}
            error={!!emailError}
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
          label={t('button.send')}
        />
      </Grid>
    </>
  );
};
