import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createSaveCoordinator } from '../../plugins/formParticipation';
import { createControlDirty } from './controlDirty';

/*
 * A control's share of its form's dirty flag. The save coordinator runs for
 * real; the control is a root of its own, disposed as the control leaving the
 * form.
 */

// One form with its participation, and a control mounted in it.
const mountForm = () =>
  createRoot(disposeForm => {
    const coordinator = createSaveCoordinator();
    const form = coordinator.participationFor('form');
    const mountControl = () =>
      createRoot(disposeControl => ({
        mark: createControlDirty(form),
        leave: disposeControl,
      }));
    return { coordinator, form, mountControl, disposeForm };
  });

// OMS-REG-PLG-DJ-03.79: units entered, then the method cleared, which takes
// the prescription control off the form with what it held.
describe('createControlDirty', () => {
  it('clears the flag it set when the control leaves the form', () => {
    const { coordinator, mountControl, disposeForm } = mountForm();
    const control = mountControl();
    control.mark(true);
    expect(coordinator.dirty()).toBe(true);
    control.leave();
    expect(coordinator.dirty()).toBe(false);
    disposeForm();
  });

  it('marks and clears while the control stays', () => {
    const { coordinator, mountControl, disposeForm } = mountForm();
    const control = mountControl();
    control.mark(true);
    control.mark(false);
    expect(coordinator.dirty()).toBe(false);
    control.mark(true);
    expect(coordinator.dirty()).toBe(true);
    disposeForm();
  });

  it('never clears a flag it did not set', () => {
    const { coordinator, form, mountControl, disposeForm } = mountForm();
    const control = mountControl();
    form.setDirty(true);
    control.mark(false);
    expect(coordinator.dirty()).toBe(true);
    control.leave();
    expect(coordinator.dirty()).toBe(true);
    disposeForm();
  });

  it('marks the form again after a save cleared it', () => {
    const { coordinator, mountControl, disposeForm } = mountForm();
    const control = mountControl();
    control.mark(true);
    coordinator.clearDirty();
    control.mark(true);
    expect(coordinator.dirty()).toBe(true);
    disposeForm();
  });
});
