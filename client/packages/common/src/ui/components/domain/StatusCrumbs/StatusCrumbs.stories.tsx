import React, { useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import Stack from '@mui/material/Stack';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import { StatusCrumbs } from './StatusCrumbs';
import { LocaleKey, useTranslation } from '@common/intl';

const statusTranslation: Record<string, LocaleKey> = {
  DRAFT: 'label.draft',
  ALLOCATED: 'label.allocated',
  PICKED: 'label.picked',
  SHIPPED: 'label.shipped',
  DELIVERED: 'label.delivered',
};

const getStatusTranslation = (currentStatus: string): LocaleKey => {
  return (
    statusTranslation[currentStatus] ??
    (statusTranslation['DRAFT'] as LocaleKey)
  );
};

const statuses = ['DRAFT', 'ALLOCATED', 'PICKED', 'SHIPPED', 'DELIVERED'];

const draft = {
  entryDatetime: '2021-08-02T21:54:09.531Z',
  allocatedDatetime: '2021-08-19T01:51:51.022Z',
  pickedDatetime: '2021-09-06T17:41:49.548Z',
  shippedDatetime: '2021-09-08T19:31:54.245Z',
  deliveredDatetime: '2021-09-16T17:41:49.548Z',
};

const defaultStatusLog: Record<string, string | null> = {
  DRAFT: draft.entryDatetime,
  ALLOCATED: draft.allocatedDatetime,
  SHIPPED: draft.shippedDatetime,
  PICKED: draft.pickedDatetime,
  DELIVERED: draft.deliveredDatetime,
};

const Template: ComponentStory<typeof StatusCrumbs> = () => {
  const [currentStatus, setCurrentStatus] = useState(statuses[4]);
  const [statusLog, setStatusLog] = useState(defaultStatusLog);

  const t = useTranslation();

  return (
    <Stack gap={2}>
      <FormControl>
        <FormLabel>Status</FormLabel>
        <RadioGroup
          defaultValue={statuses[0]}
          value={currentStatus}
          onChange={event => {
            const statusIdx = statuses.findIndex(
              status => status === event.target.value
            );

            const newStatusLog = statuses.reduce(
              (acc, status, idx) => {
                if (idx > statusIdx) {
                  acc[status] = null;
                }
                return acc;
              },
              { ...defaultStatusLog }
            );

            setStatusLog(newStatusLog);
            setCurrentStatus(event.target.value);
          }}
        >
          {statuses.map(status => {
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
        statuses={statuses}
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
