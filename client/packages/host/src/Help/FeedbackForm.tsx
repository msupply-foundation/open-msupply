import React, { ReactElement, useState } from 'react';
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

// to do: replace with backend type once generated
interface DummyFeedbackFormInput {
  // id: string;
  email: string;
  message: string;
}

export const FeedbackForm = (): ReactElement => {
  const t = useTranslation();
  const { success } = useNotification();
  const [draft, setDraft] = useState<DummyFeedbackFormInput>({
    // id: '',
    email: '',
    message: '',
  });

  // draft update
  const updateDraft = (newData: Partial<DummyFeedbackFormInput>) => {
    const newDraft: DummyFeedbackFormInput = { ...draft, ...newData };
    setDraft(newDraft);
  };

  // save input email address and message to email queue on server
  const save = async () => {
    try {
      // const result = await create();
      const successSnack = success(t('messages.message-sent')); // edit label
      successSnack();
      resetDraft();
      console.log({ draft });
    } catch {
      // todo
    }
  };

  const resetDraft = () => {
    if (draft) {
      setDraft({
        email: '',
        message: '',
      });
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
          isLoading={false} // isSaving}
          startIcon={<MailIcon />}
          type="submit"
          variant="contained"
          sx={{ fontSize: '12px' }}
          disabled={false} // !isValid}
          onClick={save}
        >
          {t('button.send')}
        </LoadingButton>
      </Grid>
    </>
  );
};
