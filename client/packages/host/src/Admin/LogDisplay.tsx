import React from 'react';
import { useLog } from '@openmsupply-client/system';
import { LogTextDisplay } from './LogTextDisplay';

export const LogDisplay = ({
  fileName,
  setLogContent,
}: {
  fileName: string;
  setLogContent: (content: string[]) => void;
}) => {
  const { data } = useLog.document.logContentsByFileName(fileName);

  if (data?.fileContent !== undefined && data?.fileContent !== null) {
    setLogContent(data?.fileContent);
  }

  return (
    <>
      {Array.isArray(data?.fileContent) && data?.fileContent != undefined ? (
        <LogTextDisplay logText={data?.fileContent}></LogTextDisplay>
      ) : null}
    </>
  );
};
