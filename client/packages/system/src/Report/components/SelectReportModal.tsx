import React, { useState } from 'react';

import { useDialog } from '@common/hooks';
import {
  AutocompleteList,
  ButtonWithIcon,
  DialogButton,
} from '@common/components';
import {
  DownloadIcon,
  EnvUtils,
  Platform,
  PrinterIcon,
  PrintFormat,
  useAuthContext,
  UserPermission,
  useTranslation,
} from '@openmsupply-client/common';
import { ReportRowFragment } from '../api';

export interface ReportOption extends ReportRowFragment {
  label: string;
}

export type SelectReportModalProps = {
  reportOptions: ReportOption[];
  onSelectReport: (report: ReportOption, printFormat: PrintFormat) => void;
  onClose: () => void;
};

export const SelectReportModal = ({
  onSelectReport,
  onClose,
  reportOptions,
}: SelectReportModalProps) => {
  const t = useTranslation();
  const { userHasPermission } = useAuthContext();
  const isAndroid = EnvUtils.platform === Platform.Android;

  const [selectedReport, setSelectedReport] = useState<ReportOption | null>(
    reportOptions.length === 1 ? (reportOptions[0] ?? null) : null
  );

  const hasPermission = userHasPermission(UserPermission.Report);

  const { Modal } = useDialog({ isOpen: true, disableMobileFullScreen: true });

  return (
    <Modal
      title={t('title.select-a-form')}
      slideAnimation={false}
      width={660}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      reportSelector={
        <>
          <ButtonWithIcon
            color="secondary"
            variant="contained"
            label={t('button.export-to-excel')}
            Icon={<DownloadIcon />}
            onClick={() => {
              if (!selectedReport) return;

              onSelectReport(selectedReport, PrintFormat.Excel);
              onClose();
            }}
            disabled={!selectedReport}
          />
          <ButtonWithIcon
            color="secondary"
            variant="contained"
            label={t('button.print')}
            Icon={<PrinterIcon />}
            onClick={() => {
              if (!selectedReport) return;

              onSelectReport(selectedReport, PrintFormat.Html);
              onClose();
            }}
            disabled={!selectedReport}
          />
          {!isAndroid && (
            <ButtonWithIcon
              color="secondary"
              variant="contained"
              label={t('button.download-pdf')}
              Icon={<DownloadIcon />}
              onClick={() => {
                if (!selectedReport) return;

                onSelectReport(selectedReport, PrintFormat.Pdf);
                onClose();
              }}
              disabled={!selectedReport}
            />
          )}
        </>
      }
    >
      <>
        {reportOptions.length === 0 ? (
          <div>
            {hasPermission
              ? t('error.no-forms-available')
              : t('error.no-form-permission')}
          </div>
        ) : (
          <AutocompleteList
            value={selectedReport}
            options={reportOptions}
            onChange={(_, report) =>
              !(report instanceof Array) && setSelectedReport(report)
            }
          />
        )}
      </>
    </Modal>
  );
};
