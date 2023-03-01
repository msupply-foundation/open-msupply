import React, { useEffect, useState } from 'react';

import { useDialog, useNativeClient } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BasicSpinner, DialogButton } from '@common/components';
import { DataTable, useColumns } from '@openmsupply-client/common';

interface LogEntry {
  id: string;
  date: string;
  time: string;
  level: string;
  message: string;
}

export const LogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation('common');
  const { Modal } = useDialog({ isOpen });
  const { readLog } = useNativeClient();
  const [logData, setLogData] = useState<LogEntry[] | undefined>(undefined);
  const parseLogEntry = (line: string, index: number): LogEntry | undefined => {
    const matches = line.match(/([^ ]+?)[ ]([^ ]+?)[ ]([^ ]+?)[ ](.+)/);
    return matches?.length === 4
      ? {
          id: `line-${index}`,
          date: matches[1] || '',
          time: matches[2] || '',
          level: matches[3] || '',
          message: matches[4] || '',
        }
      : undefined;
  };

  const columns = useColumns([
    {
      key: 'date',
      label: 'label.date',
    },
    {
      key: 'time',
      label: 'label.time',
    },
    {
      key: 'level',
      label: 'label.level',
    },
    {
      key: 'message',
      label: 'label.message',
    },
  ]);

  useEffect(() => {
    readLog().then(log => {
      console.log('============>', log);
      setLogData(
        log
          .map(parseLogEntry)
          .filter(entry => entry !== undefined) as LogEntry[]
      );
    });
  }, []);

  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
    >
      {logData ? (
        <DataTable data={logData} columns={columns} id={'log-file'} />
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
