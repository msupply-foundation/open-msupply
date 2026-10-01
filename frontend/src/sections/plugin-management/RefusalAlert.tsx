import { Show } from 'solid-js';
import type { Rejection } from '@/api/rejection';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';

/*
 * The in-dialog failure notice every surface here uses
 * (spec/plugin-management/ui-surface.md): which step failed, then the server's
 * description. None of this screen's refusals is typed (contract ›
 * rejections), so the description is the server's own text — a one-line
 * reason inline, a multi-line dump behind the error-details disclosure
 * (ui-standards › controls § action feedback).
 */
export const RefusalAlert = (props: {
  /** The step's own message, e.g. "Unable to install plugin". */
  step: string;
  rejection?: Rejection;
  testId?: string;
}) => (
  <Alert severity="error">
    <span data-testid={props.testId}>
      {props.rejection?.message
        ? `${props.step}: ${props.rejection.message}`
        : props.step}
    </span>
    <Show when={props.rejection?.detail}>
      {detail => <ErrorDetails detail={detail()} />}
    </Show>
  </Alert>
);
