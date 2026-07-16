import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import type { Report } from '../api/generate';

// S3 — the argument-entry modal (spec/reports S3, AC-R1). THIS IS A STUB: it
// carries the S1/S2 integration contract (open/close/submit + the report whose
// schema drives the form) but does not yet render the schema-driven fields. A
// follow-up replaces the body with controls built from report.argumentSchema
// (jsonSchema/uiSchema) and seeds defaults from store preferences (AC-R2/R3).
//
// The contract S2 relies on: onSubmit returns the entered arguments object; S2
// owns navigation (it writes them into the URL query, which triggers
// generation). Cancel closes without generating. Until the real form exists,
// OK submits the initial values unchanged (empty object when none), so a
// schema'd report still generates with its seeded/URL arguments.
export interface ArgumentsModalProps {
  report: Report;
  open: boolean;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (args: Record<string, unknown>) => void;
}

export const ArgumentsModal = (props: ArgumentsModalProps) => (
  <Dialog
    open={props.open}
    onClose={() => props.onClose()}
    title={t('report.filters-title')}
    description={t('report.filters-helper')}
    actions={
      <>
        <Button variant="secondary" onClick={() => props.onClose()}>
          {t('common.cancel')}
        </Button>
        <Button onClick={() => props.onSubmit(props.initialValues ?? {})}>
          {t('common.ok')}
        </Button>
      </>
    }
  />
);
