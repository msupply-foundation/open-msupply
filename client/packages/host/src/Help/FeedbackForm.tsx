import React from 'react';
import {
  Grid,
  useTranslation,
  DetailContainer,
  TextArea,
  InputWithLabelRow,
  BasicTextInput,
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
    <DetailContainer>
      <Grid
        display="flex"
        flex={1}
        container
        paddingTop={2}
        paddingBottom={1}
        width="100%"
        flexWrap="nowrap"
        maxWidth={900}
        gap={10}
      >
        <Grid
          container
          display="flex"
          flex={1}
          flexBasis="50%"
          flexDirection="column"
          gap={1}
        >
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
          {/* <StyledInputRow
            label={t('label.num-packs')}
            Input={
              <NumericTextInput
                autoFocus
                width={160}
                // value={draft.totalNumberOfPacks}
                // onChange={totalNumberOfPacks =>
                //   onUpdate({ totalNumberOfPacks })
                // }
              />
            }
          /> */}
        </Grid>
      </Grid>
    </DetailContainer>
  );
};
