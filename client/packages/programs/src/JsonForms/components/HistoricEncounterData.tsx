import React, { useEffect, useState } from 'react';
import {
  rankWith,
  uiTypeIs,
  LayoutProps,
  GroupLayout,
  Layout,
} from '@jsonforms/core';
import { JsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { z } from 'zod';
import { renderLayoutElements } from '@jsonforms/material-renderers';
import { FORM_GAP, useZodOptionsValidation } from '../common';
import { useDocument, useEncounter, useProgramEvents } from '../../api';
import { Box, FormLabel } from '@mui/material';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { Typography } from '@common/components';
import { isEmpty } from '@common/utils';

/**
 * Group-like layout control that displays historic encounter data as readonly if a certain
 * condition is met.
 * If the condition is not met the normal layout is rendered and the layout elements are editable.
 */
const Options = z
  .object({
    condition: z.object({
      /** Checks if an event of a certain type is present */
      type: z.literal('event'),
      eventType: z.string(),
    }),
  })
  .strict();
type Options = z.infer<typeof Options>;

export const historicEncounterDataTester = rankWith(
  10,
  uiTypeIs('HistoricEncounterData')
);

const UIComponent = ({
  config,
  visible,
  uischema,
  schema,
  path,
  enabled,
  renderers,
  cells,
}: LayoutProps) => {
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const [datetime, setDatetime] = useState<Date | undefined>();
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('dispensary');
  const { data: encounter } = useEncounter.document.byDocName(
    config.documentName
  );
  useEffect(() => {
    if (encounter) {
      // Look for event just before the current encounter, this avoids that we look at events from
      // the current encounter which would be problematic...
      setDatetime(new Date(new Date(encounter?.startDatetime).getTime() - 1));
    }
  }, [encounter]);

  const patientId = config?.patientId;
  const { data: events } = useProgramEvents.document.list(
    {
      at: datetime,
      filter: {
        patientId: {
          equalTo: patientId,
        },
        type: {
          equalTo: options?.condition.eventType,
        },
      },
    },
    !!options && !!datetime
  );
  const { data: previousDocument } = useDocument.get.documentByName(
    events?.nodes[0]?.documentName ?? undefined
  );

  if (!visible) {
    return null;
  }
  const elements = (uischema as GroupLayout).elements;
  if (isEmpty(elements) || !schema || path === undefined) {
    return null;
  }

  if (!!errors) {
    return (
      <FormLabel
        sx={{
          color: 'error.main',
          fontSize: '12px',
          marginLeft: '10px',
        }}
      >
        {errors}
      </FormLabel>
    );
  }
  if (previousDocument) {
    const readonlyLayout: Layout = {
      type: 'Group',
      elements: elements,
    };
    return (
      <>
        <Box display="flex" flexDirection="column" gap={FORM_GAP}>
          <JsonForms
            schema={schema}
            uischema={readonlyLayout}
            data={previousDocument.data}
            config={config}
            readonly={true}
            renderers={renderers ?? []}
          />

          <Typography
            sx={{
              fontSize: '12px',
              marginLeft: 'auto',
            }}
          >
            {t('messages.recorded-on', {
              datetime: localisedDate(previousDocument.data.startDatetime),
            })}
          </Typography>
        </Box>
      </>
    );
  }
  return (
    <>
      {renderLayoutElements(
        elements,
        schema,
        path,
        enabled ?? true,
        renderers,
        cells
      )}
    </>
  );
};

export const HistoricEncounterData = withJsonFormsLayoutProps(UIComponent);
