import React, { FC, useState } from 'react';

import { JsonData, JsonForm } from '@openmsupply-client/programs';
import { ReportRowFragment } from '../api';
import { useDialog, useUrlQuery } from '@common/hooks';
import { DialogButton, Typography } from '@common/components';
import { useAuthContext, useTranslation } from '@openmsupply-client/common';

export type ReportArgumentsModalProps = {
  /** Modal is shown if there is an argument schema present */
  report: ReportRowFragment | undefined;
  onReset: () => void;
  onArgumentsSelected: (report: ReportRowFragment, args: JsonData) => void;
};

export const ReportArgumentsModal: FC<ReportArgumentsModalProps> = ({
  report,
  onReset,
  onArgumentsSelected,
}) => {
  const { store } = useAuthContext();
  const { urlQuery } = useUrlQuery();
  const t = useTranslation();

  const {
    monthlyConsumptionLookBackPeriod,
    monthsOverstock,
    monthsUnderstock,
    monthsItemsExpire,
  } = store?.preferences ?? {};

  // default expiry date as now
  const expiryDate = Date.now()

  const [data, setData] = useState<JsonData>({
    monthlyConsumptionLookBackPeriod,
    monthsOverstock,
    monthsUnderstock,
    monthsItemsExpire,
    expiryDate,
    ...JSON.parse((urlQuery?.['reportArgs'] ?? '{}') as string),
  });
  const [error, setError] = useState<string | false>(false);

  // clean up when modal is closed
  const cleanUp = () => {
    onReset();
  };

  const { Modal } = useDialog({
    isOpen: !!report?.argumentSchema,
    onClose: cleanUp,
  });

  if (!report?.argumentSchema) {
    return null;
  }

  return (
    <Modal
      title={t("label.report-filters")}
      cancelButton={<DialogButton variant="cancel" onClick={cleanUp} />}
      slideAnimation={false}
      width={560}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!!error}
          onClick={async () => {
            onArgumentsSelected(report, data);
            cleanUp();
          }}
        />
      }
    >
      <>
        <Typography sx={{ mb: 2, maxWidth: 500 }}>
          {t('message.arguments')}
        </Typography>
        <JsonForm
          data={data}
          jsonSchema={report.argumentSchema.jsonSchema}
          uiSchema={report.argumentSchema.uiSchema}
          isError={false}
          isLoading={false}
          setError={err => setError(err)}
          updateData={(newData: JsonData) => {
            setData(newData);
          }}
        />
      </>
    </Modal>
  );
};
