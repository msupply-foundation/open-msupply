import React, { useState, useEffect } from 'react';
import { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import {
  JsonData,
  JsonForm,
  NameSearch,
  nameSearchTester,
  MasterListSearch,
  masterListSearchTester,
  LocationSearch,
  locationSearchTester,
  ReasonOptionSearch,
  reasonOptionSearchTester,
} from '@openmsupply-client/programs';
import { ReportRowFragment } from '../api';
import { useDialog, useUrlQuery } from '@common/hooks';
import { DialogButton, Typography } from '@common/components';
import {
  PrintFormat,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';

export type ReportArgumentsModalProps = {
  /** Modal is shown if there is an argument schema present */
  report: ReportRowFragment | undefined;
  printFormat?: PrintFormat;
  extraArguments?: Record<string, string | number | undefined>;
  onReset: () => void;
  onArgumentsSelected: (
    report: ReportRowFragment,
    args: JsonData,
    format?: PrintFormat
  ) => void;
};

export const ReportArgumentsModal = ({
  report,
  printFormat,
  extraArguments,
  onReset,
  onArgumentsSelected,
}: ReportArgumentsModalProps) => {
  const { store } = useAuthContext();
  const { urlQuery } = useUrlQuery();
  const t = useTranslation();
  const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;

  /**
   * Dynamically load renderers to avoid circular dependency
   *
   * Note, this is a temporary workaround to avoid the error caused by circular
   * dependencies when these components were imported directly.
   *
   * This should be refactored as part of issue: https://github.com/msupply-foundation/open-msupply/issues/8807
   */

  const [additionalRenderers, setAdditionalRenderers] = useState<
    JsonFormsRendererRegistryEntry[]
  >([]);

  useEffect(() => {
    // Dynamic import breaks the circular dependency at module load time
    const loadRenderers = async () => {
      try {
        const programsModule = await import('@openmsupply-client/programs');
        const renderers = [
          {
            tester: programsModule.patientProgramSearchTester,
            renderer: programsModule.PatientProgramSearch,
          },
          {
            tester: programsModule.programSearchTester,
            renderer: programsModule.ProgramSearch,
          },
          {
            tester: programsModule.periodSearchTester,
            renderer: programsModule.PeriodSearch,
          },
          {
            tester: programsModule.dateRangeTester,
            renderer: programsModule.DateRange,
          },
          { tester: nameSearchTester, renderer: NameSearch },
          { tester: masterListSearchTester, renderer: MasterListSearch },
          { tester: locationSearchTester, renderer: LocationSearch },
          { tester: reasonOptionSearchTester, renderer: ReasonOptionSearch },
        ];
        setAdditionalRenderers(renderers);
      } catch (error) {
        console.warn('Failed to load program renderers:', error);
        // Continue without the renderers - they're optional
      }
    };

    loadRenderers();
  }, []);

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
    timezone,
    ...extraArguments,
    ...JSON.parse((urlQuery?.['reportArgs'] ?? '{}') as string),
  });
  const [error, setError] = useState<string | false>(false);

  const { Modal } = useDialog({
    isOpen: !!report?.argumentSchema,
    disableMobileFullScreen: true,
  });

  if (!report?.argumentSchema) {
    return null;
  }

  return (
    <Modal
      title={t('label.report-filters')}
      cancelButton={<DialogButton variant="cancel" onClick={onReset} />}
      slideAnimation={false}
      width={560}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!!error}
          onClick={async () => {
            onArgumentsSelected(report, data, printFormat);
            onReset();
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
