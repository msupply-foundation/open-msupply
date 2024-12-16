import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  BufferedTextArea,
  useBufferState,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';

export const PatientDetailsComponent = () => {
  const t = useTranslation();

  const {
    query: { data },
    isDisabled,
    update: { update },
  } = usePrescription();
  const { comment } = data ?? {};
  const [commentBuffer, setCommentBuffer] = useBufferState(comment ?? '');

  const pricing = data?.pricing;
  if (!pricing) return null;

  return (
    <DetailPanelSection title={t('heading.patient-details')}>
      <Grid container gap={0.5}>
        <>
          <PanelRow style={{ marginTop: 12 }}>
            <PanelLabel>{t('heading.comment')}</PanelLabel>
            <BufferedTextArea
              disabled={isDisabled}
              onChange={e => {
                setCommentBuffer(e.target.value);
                update({ comment: e.target.value });
              }}
              value={commentBuffer}
            />
          </PanelRow>
        </>
      </Grid>
    </DetailPanelSection>
  );
};

export const PatientDetails = memo(PatientDetailsComponent);
