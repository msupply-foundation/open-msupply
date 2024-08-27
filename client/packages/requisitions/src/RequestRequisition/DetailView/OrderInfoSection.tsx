import React from 'react';
import {
  Grid,
  Autocomplete,
  useTranslation,
  useConfirmationModal,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  PanelField,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { getApprovalStatusKey } from '../../utils';

const months = [1, 2, 3, 4, 5, 6];

export const OrderInfoSection = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { minMonthsOfStock, maxMonthsOfStock, linkedRequisition, update } =
    useRequest.document.fields([
      'minMonthsOfStock',
      'maxMonthsOfStock',
      'programName',
      'linkedRequisition',
    ]);
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();

  const getMinMOSConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.changing-min-mos'),
  });

  const getMinMOSUnassignConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.unassign-min-mos'),
  });

  const getMaxMOSConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.changing-max-mos'),
  });

  return (
    <DetailPanelSection title={t('heading.order-info')}>
      <Grid container gap={0.5} key="order-info">
        {usesRemoteAuthorisation && (
          <PanelRow>
            <PanelLabel>{t('label.auth-status')}</PanelLabel>
            <PanelField>
              {t(getApprovalStatusKey(linkedRequisition?.approvalStatus))}
            </PanelField>
          </PanelRow>
        )}
        <PanelRow>
          <PanelLabel>{t('label.min-months-of-stock')}</PanelLabel>
          <PanelField>
            <Autocomplete
              disabled={isDisabled || isProgram}
              clearIcon={null}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              value={
                minMonthsOfStock === 0
                  ? { label: t('label.not-set'), value: 0 }
                  : {
                      label: t('label.number-months', {
                        count: minMonthsOfStock,
                      }),
                      value: minMonthsOfStock,
                    }
              }
              width="150px"
              options={[
                { label: t('label.not-set'), value: 0 },
                ...months.map(numberOfMonths => ({
                  label: t('label.number-months', { count: numberOfMonths }),
                  value: numberOfMonths,
                })),
              ]}
              onChange={(_, option) => {
                if (option && option.value === 0) {
                  getMinMOSUnassignConfirmation({
                    onConfirm: () => update({ minMonthsOfStock: option.value }),
                  });
                } else {
                  option &&
                    getMinMOSConfirmation({
                      onConfirm: () =>
                        update({ minMonthsOfStock: option.value }),
                    });
                }
              }}
              getOptionDisabled={option => option.value > maxMonthsOfStock}
            />
          </PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.max-months-of-stock')}</PanelLabel>
          <PanelField>
            <Autocomplete
              disabled={isDisabled || isProgram}
              clearIcon={null}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              value={{
                label: t('label.number-months', { count: maxMonthsOfStock }),
                value: maxMonthsOfStock,
              }}
              width="150px"
              options={months.map(numberOfMonths => ({
                label: t('label.number-months', { count: numberOfMonths }),
                value: numberOfMonths,
              }))}
              onChange={(_, option) =>
                option &&
                getMaxMOSConfirmation({
                  onConfirm: () => update({ maxMonthsOfStock: option.value }),
                })
              }
              getOptionDisabled={option => option.value < minMonthsOfStock}
            />
          </PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};
