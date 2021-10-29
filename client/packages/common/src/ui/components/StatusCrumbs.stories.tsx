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

export const getStatusTranslation = (
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

const Template: ComponentStory<typeof StatusCrumbs> = () => {
  const [currentStatus, setCurrentStatus] = useState(
    outboundStatuses[0] as OutboundShipmentStatus
  );

  const draft = {
    draftDatetime: '2021-08-02T21:54:09.531Z',
    allocatedDatetime: '2021-08-19T01:51:51.022Z',
    shippedDatetime: '2021-09-08T19:31:54.245Z',
    pickedDatetime: '2021-09-06T17:41:49.548Z',
    deliveredDatetime: null,
  };

  const statusLog = {
    DRAFT: draft.draftDatetime,
    ALLOCATED: draft.allocatedDatetime,
    SHIPPED: draft.shippedDatetime,
    PICKED: draft.pickedDatetime,
    DELIVERED: draft.deliveredDatetime,
  };

  const t = useTranslation();

  return (
    <Stack gap={2}>
      <FormControl>
        <FormLabel>Status</FormLabel>
        <RadioGroup
          defaultValue={outboundStatuses[0]}
          value={currentStatus}
          onChange={event =>
            setCurrentStatus(event.target.value as OutboundShipmentStatus)
          }
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
