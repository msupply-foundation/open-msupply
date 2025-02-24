import React, { FC, useState } from 'react';
import { JsonFormsRendererRegistryEntry } from '@jsonforms/core';

import {
  JsonData,
  JsonForm,
  patientProgramSearchTester,
  PatientProgramSearch,
  programSearchTester,
  ProgramSearch,
  periodSearchTester,
  PeriodSearch,
} from '@openmsupply-client/programs';
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

const additionalRenderers: JsonFormsRendererRegistryEntry[] = [
  { tester: patientProgramSearchTester, renderer: PatientProgramSearch },
  { tester: programSearchTester, renderer: ProgramSearch },
  { tester: periodSearchTester, renderer: PeriodSearch },
];

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

  const [data, setData] = useState<JsonData>({
    monthlyConsumptionLookBackPeriod,
    monthsOverstock,
    monthsUnderstock,
    monthsItemsExpire,
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
      title={t('label.report-filters')}
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
        <Typography sx={{ mb: 2 }}>{t('message.arguments')}</Typography>
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
          additionalRenderers={additionalRenderers}
        />
      </>
    </Modal>
  );
};
