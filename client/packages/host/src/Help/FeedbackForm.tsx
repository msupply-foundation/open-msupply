import React from 'react';
import {
  Grid,
  useTranslation,
  TextArea,
  InputWithLabelRow,
  BasicTextInput,
  LoadingButton,
  SaveIcon,
} from '@openmsupply-client/common';

// interface FeedbackFormProps {
//   draft: FeedbackFormFragment;
// }

export const FeedbackForm = (
  {
    // draft,
    // loading,
    // onUpdate,
    // plugins,
    // packEditable,
    // isInModal = false,
  }
) => {
  const t = useTranslation();
  // const { error } = useNotification();

  // const supplierName = draft.supplierName
  //   ? draft.supplierName
  //   : t('message.no-supplier');
  // const location = draft?.location ?? null;

  // if (loading) return null;

  return (
    <>
      <InputWithLabelRow
        label={t('label.your-email-address')}
        labelWidth="200"
        Input={
          <BasicTextInput
            value={''}
            // onChange={}
            fullWidth
          />
        }
      />
      <InputWithLabelRow
        label={t('label.message')}
        labelWidth="200"
        Input={
          <TextArea
            value={''}
            // onChange={}
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
