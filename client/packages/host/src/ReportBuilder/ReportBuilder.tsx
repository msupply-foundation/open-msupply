import React, { useEffect, useState } from 'react';

import {
  Box,
  Grid,
  TextArea,
  Typography,
  useAuthContext,
  useDebouncedValueCallback,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

import { useGenerateOneOffReport } from '../api/hooks/settings/useGenerateOneOffReport';

enum ReportEntryType {
  Manifest = 'Manifest',
  TeraTemplate = 'TeraTemplate',
  GraphGLQuery = 'GraphQlQuery',
  DefaultQuery = 'DefaultQuery',
  SQLQuery = 'SQLQuery',
  Resource = 'Resource',
  Ref = 'Ref',
}

type ReportEntryData = {
  [key: string]: string | null;
};

type ReportDefinitionEntry = {
  type: ReportEntryType;
  data: ReportEntryData | string | null;
};

type ReportDefinitionIndex = {
  template: string;
  header?: string | null;
  footer?: string | null;
  query: string[];
};

type ReportDefinition = {
  index: ReportDefinitionIndex;
  entries: Record<string, ReportDefinitionEntry>;
};

export const ReportBuilder: React.FC = () => {
  let { storeId } = useAuthContext();
  let [report, setReport] = useState<ReportDefinition>({
    index: {
      template: 'template.html',
      query: [],
    },
    entries: {},
  });

  let [dataId, setDataId] = useState<string>('');
  let [reportString, setReportString] = useState<string>('');
  let [args, setArgs] = useState<string>('{}');
  let [reportUrl, setReportUrl] = useState<string>('');
  let [error, setError] = useState<string>('');

  let { mutateAsync: renderReport } = useGenerateOneOffReport();

  let renderReportNow = () => {
    if (!reportString) {
      return;
    }
    try {
      renderReport({
        report: report,
        arguments: JSON.parse(args),
        dataId: dataId,
        storeId: storeId,
      }).then(result => {
        console.log(result);
        if (result.__typename === 'PrintReportError') {
          setError(result.error.description);
          return;
        }
        const url = `${Environment.FILE_URL}${result.fileId}`;
        setReportUrl(url);

        setError('');
      });
    } catch (e) {
      setError(`${e}`);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      renderReportNow();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [report, args, dataId]);

  return (
    <Box flex={1} padding={4}>
      <Grid container spacing={1}>
        <Grid item xs={4}>
          <Typography variant="h4">template.html</Typography>
          <TextArea
            rows={30}
            value={
              (report.entries['template.html']?.data['template'] as string) ??
              ''
            }
            onChange={e => {
              setReport({
                ...report,
                entries: {
                  ...report.entries,
                  'template.html': {
                    type: ReportEntryType.TeraTemplate,
                    data: {
                      output: 'Html',
                      template: e.target.value,
                    },
                  },
                },
              });
            }}
          />
          <Typography variant="h4">style.css</Typography>
          <TextArea
            rows={20}
            value={(report.entries['style.css']?.data as string) ?? ''}
            onChange={e => {
              setReport({
                ...report,
                entries: {
                  ...report.entries,
                  'style.css': {
                    type: ReportEntryType.Resource,
                    data: e.target.value,
                  },
                },
              });
            }}
          />
          {/* <Typography variant="h4">Arguments (JSON)</Typography>
          <TextArea
            value={args}
            onChange={e => setArgs(e.target.value ?? '')}
          /> */}

          <Typography variant="h4">Report (JSON)</Typography>
          <TextArea
            value={reportString}
            onChange={e => {
              setReportString(e.target.value ?? '');
              try {
                const report = JSON.parse(e.target.value ?? '{}');
                setReport(report);
              } catch (e) {
                setError(`Unable to parse report json ${e}`);
              }
            }}
          />
        </Grid>
        <Grid item xs={8}>
          <Typography variant="h4">DataId</Typography>
          <TextArea
            rows={1}
            value={dataId}
            onChange={e => setDataId(e.target.value ?? '')}
          />
          <Typography variant="h4">Report Output</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <iframe src={reportUrl} style={{ width: '100%', height: '100%' }} />
        </Grid>
      </Grid>
    </Box>
  );
};
