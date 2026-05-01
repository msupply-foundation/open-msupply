import { selectVisibleError, useFormErrorStore } from './store';

const reset = () => useFormErrorStore.setState({ forms: {} });

describe('FormErrorStore', () => {
  beforeEach(reset);

  it('registers a field under a form', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');

    const form = useFormErrorStore.getState().forms['f1'];
    expect(form).toBeDefined();
    expect(form?.fields['a']).toEqual({
      label: 'A',
      customError: null,
      submissionError: null,
      validationError: null,
      requiredError: null,
    });
  });

  it('does not clobber existing field state on re-register, but updates label', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.setCustomError('f1', 'a', 'oops');
    s.registerField('f1', 'a', 'A renamed');

    const field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(field?.customError).toBe('oops');
    expect(field?.label).toBe('A renamed');
  });

  it('unregisters a field', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.unregisterField('f1', 'a');
    expect(useFormErrorStore.getState().forms['f1']?.fields['a']).toBeUndefined();
  });

  it('selectVisibleError follows custom > invalid > required precedence', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.setRequiredError('f1', 'a', 'Required');
    s.setValidationError('f1', 'a', 'Invalid');
    s.setCustomError('f1', 'a', 'Custom');

    const field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(field, true)?.kind).toBe('custom');

    s.setCustomError('f1', 'a', null);
    const field2 = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(field2, true)?.kind).toBe('invalid');

    s.setValidationError('f1', 'a', null);
    const field3 = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(field3, true)?.kind).toBe('required');

    // Required is hidden when showRequired is false
    expect(selectVisibleError(field3, false)).toBeNull();
  });

  it('submission errors are gated by showRequired and lose to immediate custom/invalid', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.setSubmissionError('f1', 'a', 'Submit-only');

    // Hidden until showRequired flips
    const before = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(before, false)).toBeNull();
    expect(selectVisibleError(before, true)?.kind).toBe('submission');

    // Loses to validation when shown
    s.setValidationError('f1', 'a', 'Invalid');
    const withInvalid = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(withInvalid, true)?.kind).toBe('invalid');

    // Loses to immediate custom error when shown
    s.setValidationError('f1', 'a', null);
    s.setCustomError('f1', 'a', 'Immediate');
    const withCustom = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(withCustom, true)?.kind).toBe('custom');
  });

  it('hasVisibleErrors counts submission errors only when showRequired is on', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.setSubmissionError('f1', 'a', 'Submit-only');
    expect(s.hasVisibleErrors('f1')).toBe(false);
    s.showRequiredErrors('f1');
    expect(useFormErrorStore.getState().hasVisibleErrors('f1')).toBe(true);
  });

  it('clearing a custom error reveals the underlying validation error', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.setValidationError('f1', 'a', 'Invalid');
    s.setCustomError('f1', 'a', 'Custom');
    s.setCustomError('f1', 'a', null);
    const field = useFormErrorStore.getState().forms['f1']?.fields['a'];
    expect(selectVisibleError(field, false)?.kind).toBe('invalid');
  });

  it('hasVisibleErrors respects showRequired', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.setRequiredError('f1', 'a', 'Required');
    expect(s.hasVisibleErrors('f1')).toBe(false);
    s.showRequiredErrors('f1');
    expect(useFormErrorStore.getState().hasVisibleErrors('f1')).toBe(true);
    useFormErrorStore.getState().resetRequiredErrors('f1');
    expect(useFormErrorStore.getState().hasVisibleErrors('f1')).toBe(false);
  });

  it('clearForm removes all state for that formId', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    s.registerField('f2', 'b', 'B');
    s.clearForm('f1');
    const state = useFormErrorStore.getState();
    expect(state.forms['f1']).toBeUndefined();
    expect(state.forms['f2']).toBeDefined();
  });

  it('no-ops when setting an unchanged value (referential equality)', () => {
    const s = useFormErrorStore.getState();
    s.registerField('f1', 'a', 'A');
    const before = useFormErrorStore.getState();
    s.setCustomError('f1', 'a', null);
    const after = useFormErrorStore.getState();
    expect(after).toBe(before);
  });
});
