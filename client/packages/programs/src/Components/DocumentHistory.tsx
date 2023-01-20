import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ChevronDownIcon } from '@common/icons';
import React, { FC } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { BasicSpinner, Box, useFormatDateTime } from 'packages/common/src';
import { DocumentFragment, useDocument } from '../api';

export const DocumentHistory: FC<{ documentName: string }> = ({
  documentName,
}) => {
  const { data: history } = useDocument.get.history(documentName);

  const findFirstParent = (
    head: DocumentFragment,
    history: DocumentFragment[]
  ): DocumentFragment | undefined => {
    const parentId = head.parents[0];
    if (parentId === undefined) {
      return undefined;
    }
    return history.find(node => node.id === parentId);
  };
  const toString = (node: DocumentFragment | undefined): string => {
    if (node === undefined) {
      return '';
    }
    const clone = JSON.parse(JSON.stringify(node));
    delete clone['__typename'];
    return JSON.stringify(clone, undefined, 2);
  };
  const datetimeFormat = useFormatDateTime();

  if (history === undefined) return <BasicSpinner />;
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
              }}
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
                  {datetimeFormat.customDate(h.timestamp, 'P pp')}
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
