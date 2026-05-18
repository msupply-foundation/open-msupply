import React from 'react';
import { SxProps } from '@mui/material';
import { useTranslation } from '@common/intl';
import { Alert } from '@common/components';
import { AlertIcon } from '@common/icons';
import { List, ListItem } from '@mui/material';
import { isEqual } from '@common/utils';
import { useFormErrorStore, selectVisibleError } from './store';

export type FormErrorListEntry = {
  fieldId: string;
  label: string;
  message: string;
};

export type ErrorDisplayItem = {
  key: string;
  label: string;
  message: string;
};

/**
 * Returns the flat list of currently-visible errors for a form, in the same
 * shape `<ErrorDisplay>` renders by default. Useful for consumers that want
 * to compute a custom summary layout (grouping, filtering, re-ordering) and
 * pass the result back via `<ErrorDisplay items={...} />`.
 */
export const useFormErrorList = (formId: string): FormErrorListEntry[] =>
  // The selector below builds a fresh array on every store update, so the
  // default `Object.is` check would re-render consumers on every unrelated
  // store tick (e.g. a keystroke in another field). Use a deep equality
  // check so re-renders only happen when the visible errors actually change.
  useFormErrorStore(state => {
    const form = state.forms[formId];
    if (!form) return EMPTY_LIST;
    const list: FormErrorListEntry[] = [];
    Object.entries(form.fields).forEach(([fieldId, entry]) => {
      const visible = selectVisibleError(entry, form.showRequired);
      if (visible) {
        list.push({
          fieldId,
          label: visible.label || fieldId,
          message: visible.message,
        });
      }
    });
    return list;
  }, isEqual);

const EMPTY_LIST: FormErrorListEntry[] = [];

type ErrorDisplayProps =
  | {
      // Default mode — read entries from the form's store.
      formId: string;
      items?: undefined;
      sx?: SxProps;
    }
  | {
      // Override mode — render the supplied items verbatim. Use this with
      // `useFormErrorList` to build custom summaries (e.g. grouping by row).
      formId?: undefined;
      items: ErrorDisplayItem[];
      sx?: SxProps;
    };

/**
 * Renders a summary of visible form errors. Two modes:
 *
 *   <ErrorDisplay formId="my-form" />
 *     — reads from the store and renders the default flat list.
 *
 *   <ErrorDisplay items={[...]} />
 *     — renders the supplied items verbatim. Pair with `useFormErrorList`
 *       to build custom layouts (grouping, filtering) without losing the
 *       Alert chrome and styling.
 *
 * Hidden when there are no items to render.
 */
export const ErrorDisplay = (props: ErrorDisplayProps) => {
  if (props.items !== undefined) {
    return <ErrorDisplayInternal items={props.items} sx={props.sx} />;
  }
  return <ErrorDisplayFromStore formId={props.formId} sx={props.sx} />;
};

const ErrorDisplayFromStore = ({
  formId,
  sx,
}: {
  formId: string;
  sx?: SxProps;
}) => {
  const errors = useFormErrorList(formId);
  const items = errors.map(({ fieldId, label, message }) => ({
    key: fieldId,
    label,
    message,
  }));
  return <ErrorDisplayInternal items={items} sx={sx} />;
};

const ErrorDisplayInternal = ({
  items,
  sx,
}: {
  items: ErrorDisplayItem[];
  sx?: SxProps;
}) => {
  const t = useTranslation();
  if (items.length === 0) return null;
  return (
    <Alert
      severity="error"
      icon={<AlertIcon fontSize="large" />}
      sx={{
        whiteSpace: 'pre-wrap',
        '& .MuiAlert-icon': { alignItems: 'center' },
        ...sx,
      }}
    >
      {t('messages.alert-problem-with-form-input')}
      <List sx={{ m: 0, p: 0 }}>
        {items.map(({ key, label, message }) => (
          <ListItem
            key={key}
            sx={{ pt: 0, pb: 0, m: 0 }}
          >{`- ${label}: ${message}`}</ListItem>
        ))}
      </List>
    </Alert>
  );
};
