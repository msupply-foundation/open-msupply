import React, { useEffect, useState } from 'react';

import {
  Box,
  Grid,
  TextArea,
  Typography,
  useAuthContext,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

import { useGenerateOneOffReport } from '../api/hooks/settings/useGenerateOneOffReport';
/*pub enum ReportDefinitionEntry {
    Manifest(Manifest),
    TeraTemplate(TeraTemplate),
    /// Custom http query
    GraphGLQuery(GraphQlQuery),
    /// Use default predefined query
    DefaultQuery(DefaultQuery),
    SQLQuery(SQLQuery),
    Resource(serde_json::Value),
    /// Entry reference to another report definition
    Ref(ReportRef),
}*/

// type ReportDefinitionEntry = {
//   Manifest: Manifest;
//   TeraTemplate: TeraTemplate;
//   GraphGLQuery: GraphQlQuery;
//   DefaultQuery: DefaultQuery;
//   SQLQuery: SQLQuery;
//   Resource: any;
//   Ref: ReportRef;
// };

/*
pub struct ReportDefinitionIndex {
    pub template: Option<String>,
    pub header: Option<String>,
    pub footer: Option<String>,
    #[serde(deserialize_with = "string_or_vec")]
    pub query: Vec<String>,
}
*/
type ReportDefinitionIndex = {
  template: string;
  header: string;
  footer: string;
  query: string[];
};

type ReportDefinition = {
  index: ReportDefinitionIndex;
  // entries: Map<string, ReportDefinitionEntry>;
};

type Report = {
  template: string;
  templateData: string;
  graphql: string;
  graphql_params: string;
  sql: string;
};

export const ReportBuilder: React.FC = () => {
  let { storeId } = useAuthContext();
  let [report, setReport] = useState<Report>({
    template: '<html><h1>test</h1></html>',
    templateData: '{}',
    graphql: '',
    graphql_params: '{dataId: "something"}',
    sql: '',
  });

  let [dataId, setDataId] = useState<string>('');
  let [reportString, setReportString] = useState<string>('');
  let [args, setArgs] = useState<string>('{}');
  let [output, setOutput] = useState<string>('');
  let [error, setError] = useState<string>('');

  let { mutateAsync: renderReport } = useGenerateOneOffReport();

  useEffect(() => {
    if (!reportString) {
      return;
    }
    try {
      renderReport({
        report: JSON.parse(reportString),
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
        setOutput(url);

        setError(url);
      });
    } catch (e) {
      setError(`${e}`);
    }
  }, [reportString, args, dataId]);

  // useEffect(() => {
  //   try {
  //     let x = wasm.render_one_off(report.template, report.templateData);
  //     setOutput(x);
  //     setError('');
  //   } catch (e) {
  //     setError(`${e}`);
  //   }
  // }, [report]);

  return (
    <Box flex={1} padding={4}>
      <Grid container spacing={1}>
        <Grid item xs={4}>
          <Typography variant="h4">Report (JSON)</Typography>
          <TextArea
            value={reportString}
            onChange={e => setReportString(e.target.value ?? '')}
          />
          <Typography variant="h4">Arguments (JSON)</Typography>
          <TextArea
            value={args}
            onChange={e => setArgs(e.target.value ?? '')}
          />
          <Typography variant="h4">DataId</Typography>
          <TextArea
            value={dataId}
            onChange={e => setDataId(e.target.value ?? '')}
          />
          <Typography variant="h4">Template</Typography>
          <TextArea
            value={report?.template}
            onChange={e =>
              setReport({ ...report, template: e.target.value ?? '' })
            }
          />
          <Typography variant="h4">Graphql</Typography>
          <TextArea
            value={report?.graphql}
            onChange={e =>
              setReport({ ...report, graphql: e.target.value ?? '' })
            }
          />
          <Typography variant="h4">params</Typography>
          <TextArea
            value={report?.graphql_params}
            onChange={e =>
              setReport({ ...report, graphql_params: e.target.value ?? '' })
            }
          />
        </Grid>
        <Grid item xs={8}>
          <Typography variant="h4">Report Output</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <iframe src={output} style={{ width: '100%', height: '100%' }} />
        </Grid>
      </Grid>
    </Box>
  );
};
