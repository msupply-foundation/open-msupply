import React, { useEffect, useState } from 'react';
import { rankWith, uiTypeIs, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps, useJsonForms } from '@jsonforms/react';
import {
  Line,
  LineChart,
  useFormatDateTime,
  XAxis,
  YAxis,
  Box,
  FormLabel,
} from '@openmsupply-client/common';
import { useZodOptionsValidation } from '../common';
import {
  CartesianGrid,
  Tooltip,
  TooltipProps,
  Label,
  ReferenceLine,
} from 'recharts';
import { useEncounter } from '../../api';
import { z } from 'zod';
import { extractProperty } from '@common/utils';

export const encounterLineChartTester = rankWith(
  4,
  uiTypeIs('EncounterLineChart')
);

type Options = {
  values: ValueOption[];
  horizontalRulers?: HorizontalRulers[];
};

type ValueOption = {
  field: string;
  label: string;
  unit: string;
};

type HorizontalRulers = {
  position: number;
  colour: string;
};

const ValueOption: z.ZodType<ValueOption> = z
  .object({
    field: z.string(),
    label: z.string(),
    unit: z.string(),
  })
  .strict();

const horizontalRuler: z.ZodType<HorizontalRulers> = z
  .object({
    position: z.number(),
    colour: z.string(),
  })
  .strict();

const Options: z.ZodType<Options> = z
  .object({
    values: z.array(ValueOption),
    horizontalRulers: z.array(horizontalRuler).optional(),
  })
  .strict();

type DateTimeTooltipProps = TooltipProps<string, string> & {
  name: string;
  unit: string;
};

const DateTimeTooltip = (props: DateTimeTooltipProps) => {
  const { localisedDateTime } = useFormatDateTime();

  if (!props.active || props.payload?.[0] === undefined) {
    return null;
  }
  return (
    <Box padding={0.5} border={1} borderColor={'lightgray'}>
      <p>{`${localisedDateTime(props.label)}`}</p>
      <p>{`${props.name}: ${props.payload[0].value} ${props.unit}`}</p>
    </Box>
  );
};

type DataType = { time: number; y: number };

const UIComponent = (props: ControlProps) => {
  const { visible, uischema } = props;
  const { dayMonthShort } = useFormatDateTime();
  const { core } = useJsonForms();
  const id = useEncounter.utils.idFromUrl();
  const { data: encounter } = useEncounter.document.byId(id);
  const [data, setData] = useState([] as DataType[]);
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  // TODO support multiple lines
  const option = options?.values[0];
  const currentData = extractProperty(core?.data ?? {}, option?.field ?? '');

  const { data: encounterFields } = useEncounter.encounterFields(
    encounter?.patient.id ?? '',
    [option?.field ?? ''],
    !!option
  );

  useEffect(() => {
    const data =
      encounterFields?.map(d => {
        return {
          time: new Date(d.encounter.startDatetime).getTime() / 1000,
          y: d.fields[0],
        };
      }) ?? [];

    // replace or add the current point
    if (!!currentData && encounter) {
      const currentTime = new Date(encounter.startDatetime).getTime() / 1000;
      const currentPoint: DataType = {
        time: currentTime,
        y: currentData,
      };
      const currentIndex = data.findIndex(it => it.time === currentTime);
      if (currentIndex === -1) {
        data.push(currentPoint);
        data.sort((a, b) => a.time - b.time);
      } else {
        data[currentIndex] = currentPoint;
      }
    }

    setData(data);
  }, [encounterFields, currentData]);

  if (errors) {
    return <FormLabel>EncounterLineChart: {errors}</FormLabel>;
  }
  if (!visible || !option) {
    return null;
  }

  // with no valid data, the y-axis label cannot be shown, so we provide some defaults
  const domain =
    data.every(value => value.y === null) || data.length === 0
      ? [0, 100]
      : undefined;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={2}
    >
      <LineChart
        width={500}
        height={250}
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          scale="time"
          tickFormatter={dayMonthShort}
          domain={['auto', 'auto']}
        />
        <YAxis domain={domain}>
          <Label
            value={`${option.label ?? '-'} [${option.unit ?? '?'}]`}
            angle={-90}
            position={{ x: 0, y: 10 }}
          />
        </YAxis>
        <Tooltip
          content={
            <DateTimeTooltip
              name={option.label ?? '-'}
              unit={option.unit ?? '?'}
            />
          }
        />
        {options?.horizontalRulers
          ? options?.horizontalRulers?.map(ruler => (
              <ReferenceLine
                key={ruler.position}
                y={ruler.position}
                stroke={ruler.colour}
                strokeDasharray="3 3"
              />
            ))
          : null}
        <Line
          type="monotone"
          dataKey="y"
          stroke="#8884d8"
          isAnimationActive={false}
        />
      </LineChart>
    </Box>
  );
};

export const EncounterLineChart = withJsonFormsControlProps(UIComponent);
