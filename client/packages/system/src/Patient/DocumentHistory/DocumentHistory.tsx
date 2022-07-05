import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ChevronDownIcon } from '@common/icons';
import { DocumentNode } from 'packages/common/src/types/schema';
import React, { FC, useEffect, useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { usePatient } from '../api';
import { Box } from 'packages/common/src';

export const DocumentHistory: FC<{ documentName: string }> = ({
  documentName,
}) => {
  const [history, setHistory] = useState([] as DocumentNode[]);

  const { data: docHistory } = usePatient.document.history(documentName);
  useEffect(() => {
    if (docHistory) {
      setHistory(docHistory);
    }
  }, [docHistory]);

  const findFirstParent = (
    head: DocumentNode,
    history: DocumentNode[]
  ): DocumentNode | undefined => {
    const parentId = head.parents[0];
    if (parentId === undefined) {
      return undefined;
    }
    return history.find(node => node.id === parentId);
  };
  const toString = (node: DocumentNode | undefined): string => {
    if (node === undefined) {
      return '';
    }
    return JSON.stringify(node, undefined, 2);
  };

  return (
    <div>
      {history.map((h, i) => (
        <div key={i}>
          <Accordion
            key={i}
            sx={{
              mt: '0 !important',
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDownIcon />}
              sx={{
                '.MuiAccordionSummary-content': {
                  margin: '5px !important',
                },
                '.Mui-expanded': {
                  marginBottom: '0 !important',
                },
              }}
              style={{ margin: 0, minHeight: 0 }}
            >
              <Box display="flex" flexDirection="column" gap={0.2}>
                <Typography
                  sx={{
                    fontWeight: 'bold',
                    textAlign: 'start',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Edit {history.length - i}
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 'normal',
                    textAlign: 'start',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h.timestamp}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <ReactDiffViewer
                newValue={toString(h)}
                oldValue={toString(findFirstParent(h, history))}
                splitView={false}
                disableWordDiff={true}
              />
            </AccordionDetails>
          </Accordion>
        </div>
      ))}
    </div>
  );
};
