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

  const array = data?.fileContent;

  if (typeof array === 'string') {
    setLogContent(array);
  }

  return (
    <>
      {Array.isArray(data?.fileContent) && data?.fileContent != undefined ? (
        <LogTextDisplay logText={data?.fileContent}></LogTextDisplay>
      ) : null}
    </>
  );
};
