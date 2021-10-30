import React, { useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { StatusCrumbs } from './StatusCrumbs';
import { OutboundShipmentStatus } from '../..';
import { LocaleKey, useTranslation } from '../../intl/intlHelpers';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';

const StatusTranslation: Record<OutboundShipmentStatus, LocaleKey> = {
  DRAFT: 'label.draft',
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
};

const getStatusTranslation = (
  currentStatus: OutboundShipmentStatus
): LocaleKey => {
  return StatusTranslation[currentStatus] ?? StatusTranslation.DRAFT;
};

const outboundStatuses: OutboundShipmentStatus[] = [
  'DRAFT',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
];

const draft = {
  draftDatetime: '2021-08-02T21:54:09.531Z',
  allocatedDatetime: '2021-08-19T01:51:51.022Z',
  pickedDatetime: '2021-09-06T17:41:49.548Z',
  shippedDatetime: '2021-09-08T19:31:54.245Z',
  deliveredDatetime: '2021-09-16T17:41:49.548Z',
};

const defaultStatusLog: Record<OutboundShipmentStatus, string | null> = {
  DRAFT: draft.draftDatetime,
  ALLOCATED: draft.allocatedDatetime,
  SHIPPED: draft.shippedDatetime,
  PICKED: draft.pickedDatetime,
  DELIVERED: draft.deliveredDatetime,
};

const Template: ComponentStory<typeof StatusCrumbs> = () => {
  const [currentStatus, setCurrentStatus] = useState(outboundStatuses[4]);
  const [statusLog, setStatusLog] = useState(defaultStatusLog);

  const t = useTranslation();

  return (
    <Stack gap={2}>
      <FormControl>
        <FormLabel>Status</FormLabel>
        <RadioGroup
          defaultValue={outboundStatuses[0]}
          value={currentStatus}
          onChange={event => {
            const statusIdx = outboundStatuses.findIndex(
              status => status === event.target.value
            );

            const newStatusLog = outboundStatuses.reduce(
              (acc, status, idx) => {
                if (idx > statusIdx) {
                  acc[status] = null;
                }
                return acc;
              },
              { ...defaultStatusLog }
            );

            setStatusLog(newStatusLog);
            setCurrentStatus(event.target.value as OutboundShipmentStatus);
          }}
        >
          {outboundStatuses.map(status => {
            return (
              <FormControlLabel
                key={status}
                value={status}
                control={<Radio />}
                label={t(getStatusTranslation(status))}
              />
            );
          })}
        </RadioGroup>
      </FormControl>

      <StatusCrumbs
        statuses={outboundStatuses}
        statusLog={statusLog}
        statusFormatter={getStatusTranslation}
      />
    </Stack>
  );
};

export const Primary = Template.bind({});

export default {
  title: 'Components/StatusCrumbs',
  component: StatusCrumbs,
} as ComponentMeta<typeof StatusCrumbs>;
