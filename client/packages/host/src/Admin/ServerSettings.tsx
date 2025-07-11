import React from 'react';

import {
  useToggle,
  BaseButton,
  useTranslation,
  DownloadIcon,
  DatabaseType,
  Tooltip,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

import { Setting } from './Setting';
import { WebAppLogFileModal } from './WebAppLogFileModal';
import { useDatabaseSettings } from '../api/hooks/settings/useDatabaseSettings';

export const ServerSettings = () => {
  const { data: databaseSettings } = useDatabaseSettings();
  const t = useTranslation();
  const {
    isOn: isLogShown,
    toggleOn: showLog,
    toggleOff: hideLog,
  } = useToggle();

  return (
    <>
      <Setting
        title={t('label.server-log')}
        component={
          <>
            <WebAppLogFileModal onClose={hideLog} isOpen={isLogShown} />
            <BaseButton onClick={showLog}>{t('button.view')}</BaseButton>
          </>
        }
      />
      <Setting
        title={t('label.download-database')}
        component={
          <Tooltip
            title={
              databaseSettings?.databaseType !== DatabaseType.SqLite
                ? t('message.database-not-sqlite')
                : t('label.download-database')
            }
          >
            <span>
              <BaseButton
                disabled={
                  databaseSettings?.databaseType !== DatabaseType.SqLite
                }
                startIcon={<DownloadIcon />}
                onClick={() => {
                  open(`${Environment.API_HOST}/support/database`, '_blank');
                }}
              >
                {t('button.download')}
              </BaseButton>
            </span>
          </Tooltip>
        }
      />
    </>
  );
};
