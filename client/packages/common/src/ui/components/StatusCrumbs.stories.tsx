import React, { useState } from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';
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
  draft: 'label.draft',
  allocated: 'label.allocated',
  picked: 'label.picked',
  shipped: 'label.shipped',
  delivered: 'label.delivered',
};

export const getStatusTranslation = (
  currentStatus: OutboundShipmentStatus
): LocaleKey => {
  return StatusTranslation[currentStatus] ?? StatusTranslation.draft;
};

const outboundStatuses: OutboundShipmentStatus[] = [
  'draft',
  'allocated',
  'picked',
  'shipped',
  'delivered',
];

const Template: ComponentStory<typeof StatusCrumbs> = () => {
  const [currentStatus, setCurrentStatus] = useState(
    outboundStatuses[0] as OutboundShipmentStatus
  );

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
        currentStatus={currentStatus}
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
