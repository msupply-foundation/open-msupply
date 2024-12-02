import React, { ReactElement, useState } from 'react';
import {
  Grid,
  useTranslation,
  TextArea,
  InputWithLabelRow,
  BasicTextInput,
  LoadingButton,
  SaveIcon,
} from '@openmsupply-client/common';

// to do: replace with backend type once generated
interface DummyFeedbackFormInput {
  id: string;
  email: string;
  message: string;
}

// state
// updating state
// button to submit and
// refactor into external hook
// show success notification and clear form once backend has successfuly received data

export const FeedbackForm = (): ReactElement => {
  const t = useTranslation();
  const [draft, setDraft] = useState<DummyFeedbackFormInput>({
    id: '',
    email: '',
    message: '',
  });

  //draft hook
  const updateDraft = (newData: Partial<DummyFeedbackFormInput>) => {
    const newDraft: DummyFeedbackFormInput = { ...draft, ...newData };
    setDraft(newDraft);
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
          startIcon={<SaveIcon />}
          type="submit"
          variant="contained"
          sx={{ fontSize: '12px' }}
          disabled={false} // !isValid}
          onClick={() => {}} // onSave}
        >
          {t('button.save')}
        </LoadingButton>
      </Grid>
    </>
  );
};
