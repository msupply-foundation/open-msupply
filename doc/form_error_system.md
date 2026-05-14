# Form Error System

A reusable system for tracking, displaying, and validating form input errors on the open-mSupply client. Designed around the use case of "show all errors as a summary below the form, allow illegal input to be typed but flag it, and don't show 'required' errors until the user tries to submit."

Source: [client/packages/common/src/hooks/useFormErrors/](../client/packages/common/src/hooks/useFormErrors/).
Reference implementation: [client/packages/system/src/Patient/Insurance/InsuranceModal.tsx](../client/packages/system/src/Patient/Insurance/InsuranceModal.tsx).

---

## How it works

### Single global store

Errors live in one global Zustand store keyed by `formId`. There's no provider to wrap the form in; pick a `formId` string (e.g. `'patient-insurance'`) and use it consistently. Multiple forms can be open at once and won't interfere with each other.

```ts
// store shape (simplified)
{
  forms: {
    'patient-insurance': {
      fields: {
        policyNumberFamily: { label, customError, validationError, requiredError },
        // ...
      },
      showRequired: false,
    },
  },
}
```

### Four error kinds

Each field independently tracks four slots, with display precedence **`custom > invalid > submission > required`**:

| Kind | Source | Visible when |
|------|--------|--------------|
| `custom` | `customError` (string form) on the input | always |
| `invalid` | `validate(value)` callback, or set by the input component itself (e.g. `NumericTextInput`'s built-in min/max) | always |
| `submission` | `customError={{ message, showOnSubmit: true }}` on the input | only after the form's `showRequired` flag is set (i.e. user has attempted Save) |
| `required` | derived from `required && !value` | only after `showRequired` is set |

Because the slots are independent, clearing one reveals the next-highest-priority error rather than leaving the field looking valid when it isn't.

### Required-error visibility

On initial form load, `showRequired` is `false`, so even though required-errors are tracked internally, the user doesn't see "your form is full of errors" before they've done anything. When the user clicks Save, the form calls `form.showRequired()` and the summary appears for every still-missing required field. As the user fills each field in, that field's required-error is automatically removed (because the value is no longer empty), and the summary shrinks. The flag stays on for the rest of the form's lifetime so partial fixes don't hide the remaining errors.

### Cleanup

Form state is cleared when the form's `useForm()` host unmounts. For modals this means closing and reopening starts fresh. For long-lived pages that should retain state across re-renders, pass `useForm(formId, { persist: true })`.

---

## API reference

### `useForm(formId, options?)` &nbsp;— form-side

Call once near the top of the form (e.g. in the modal component). Returns:

| Property | Use |
|----------|-----|
| `showRequired()` | flip the form's `showRequired` flag — typically called from your save handler before checking `hasErrors()` |
| `resetRequired()` | flip it back off — used for explicit "reset/clear form" actions, **not** on every keystroke |
| `hasErrors()` | snapshot read; returns true if any field has a visible error (counts `kind: 'required'` only when `showRequired` is on) |
| `clear()` | wipe all fields and the `showRequired` flag for this form |

Options:

- `persist: true` — disable the unmount cleanup. Default is to clear on unmount.

### `useFormField(options)` &nbsp;— input-side, internal

Used **inside** input components (e.g. `BasicTextInput`). You normally won't call this directly from a form. Returns `{ error: boolean, visibleError, setCustomError, setValidationError }`. See `BasicTextInput.tsx`/`NumericTextInput.tsx` for the integration pattern.

### `<FieldErrorWrapper>` &nbsp;— consumer-side fallback

Render-prop wrapper for inputs that haven't (or shouldn't) be modified to call `useFormField` directly. Wrap a composite component and pass through the `error` prop:

```tsx
<FieldErrorWrapper
  formId={FORM_ID}
  fieldId="policyType"
  label={t('label.policy-type')}
  value={draft.policyType}
  required
>
  {({ error, required }) => (
    <InsurancePolicySelect
      policyType={draft.policyType}
      error={error}
      required={required}
      onChange={value => updatePatch({ policyType: value })}
    />
  )}
</FieldErrorWrapper>
```

The render-prop also receives `setCustomError(msg | null)` and `setValidationError(msg | null)` if the inner component needs imperative control.

### `<ErrorDisplay formId={...} />` &nbsp;— consumer-side

Renders the red `<Alert>` summary listing the form's visible errors, or nothing if there are none. Drop it once per form, typically below the form body.

### `formError` prop &nbsp;— input-side

Any input that has been opted into the system accepts:

```tsx
formError={{
  formId: string,     // which form this field belongs to
  fieldId: string,    // unique within the form
  label: string,      // shown in the error summary
}}
customError?: string | { message: string; showOnSubmit?: boolean } | null
```

The string form shows the error immediately. The object form with `showOnSubmit: true` defers the error until the user attempts Save — useful for cross-field rules that trip on default values, where you don't want the user to see an error before they've touched anything.

Currently supported on `BasicTextInput`, `NumericTextInput`, `DateTimePickerInput`. (`Autocomplete` accepts a top-level `error: boolean` that you'd typically feed from `<FieldErrorWrapper>` rather than `formError` directly, since the wrapper sees the actual selected value.)

When `formError` is omitted the input behaves exactly as before — opt-in is the default.

#### Special case: `NumericTextInput`

When `formError` is set, `NumericTextInput` skips its usual clamp-to-`min`/`max` behaviour and surfaces violations through the form-error system instead — matching the goal of "allow illegal input but flag it." Without `formError` the legacy clamping is preserved.

#### Special case: `DateTimePickerInput`

`error` was widened from `ReactNode` to `boolean`. Use the new `errorText: ReactNode` prop where you previously passed a string into `error` to drive the `helperText` display. A truthy `errorText` automatically implies `error: true` (red border + helper text together), so callers usually only need one of the two.

---

## Implementation guide — adding the system to a form

### 1. Pick a `formId`

Any unique string. Convention: kebab-case, descriptive. E.g. `'create-patient'`, `'edit-immunisation-course'`.

### 2. Call `useForm` and drop in `<ErrorDisplay>`

```tsx
const FORM_ID = 'my-form';

export const MyForm = () => {
  const form = useForm(FORM_ID);

  const handleSave = async () => {
    form.showRequired();
    if (form.hasErrors()) return;
    await actuallySave();
  };

  return (
    <Modal okButton={<DialogButton variant="save" onClick={handleSave} />}>
      {/* ... fields ... */}
      <ErrorDisplay formId={FORM_ID} />
    </Modal>
  );
};
```

`FORM_ID` is just a module-level string constant. Reference it wherever you need it — there's no provider to wrap and no extra component to add.

### 3. Wire each field

For inputs with native support (`BasicTextInput`, `NumericTextInput`, `DateTimePickerInput`), add the `formError` prop:

```tsx
<BasicTextInput
  formError={{ formId: FORM_ID, fieldId: 'patientName', label: t('label.patient-name') }}
  required
  value={draft.patientName}
  onChange={e => updatePatch({ patientName: e.target.value })}
/>
```

For composite components (custom Selects, Autocompletes, third-party widgets), use `<FieldErrorWrapper>`:

```tsx
<FieldErrorWrapper
  formId={FORM_ID}
  fieldId="program"
  label={t('label.program')}
  value={draft.programId}
  required
>
  {({ error, required }) => (
    <ProgramSelect
      value={draft.programId}
      error={error}
      required={required}
      onChange={id => updatePatch({ programId: id })}
    />
  )}
</FieldErrorWrapper>
```

### 4. Custom validation

Two ways to express it. Pick whichever reads better at the call site.

**Reactive prop** — use when the rule is a pure function of the current draft. Pass a string for an immediate error:

```tsx
<NumericTextInput
  formError={{ formId: FORM_ID, fieldId: 'discount', label: t('label.discount') }}
  customError={draft.discount > 110 ? t('messages.too-big') : null}
  min={0}
  max={100}
  ...
/>
```

…or an object with `showOnSubmit: true` to defer the message until the user attempts Save:

```tsx
<NumericTextInput
  formError={{ formId: FORM_ID, fieldId: 'discount', label: t('label.discount') }}
  customError={
    draft.isActive && (draft.discount ?? 0) === 0
      ? {
          message: t('messages.active-policy-needs-coverage'),
          showOnSubmit: true,
        }
      : null
  }
  ...
/>
```

Use `showOnSubmit` for cross-field rules that can trip on default values (which would otherwise show an error on a freshly opened form). The `showOnSubmit` flag is intentionally not available on `validate` — `validate` is per-field and only fires once the user has typed/picked something, so it doesn't have the "error visible before any user interaction" problem that `customError` can have.

**`validate` callback** — use when the rule is per-input, returns a message based on the value, and you don't want to rebuild the message every render:

```tsx
<DateTimePickerInput
  formError={{ formId: FORM_ID, fieldId: 'expiry', label: t('label.expiry') }}
  required
  validate={date =>
    date && date < today ? t('error.date-in-past') : null
  }
  value={draft.expiry}
  onChange={...}
/>
```

Both feed the `kind: 'invalid'` slot. They don't compete with each other in practice (you'd use one or the other for a given field), but if both are set, the `validate` callback fills `validationError` and the prop fills `customError` — and `custom` wins by precedence.

### 5. (Optional) Imperative error setting

If your input component runs validation logic itself (like `NumericTextInput`'s built-in min/max), call `useFormField` inside it and use the returned `setValidationError(msg)` / `setCustomError(msg)`. Both are stable across renders.

### 6. Avoid `resetRequired()` on input

A common pitfall: don't call `form.resetRequired()` on every `updatePatch` / keystroke. Once the user has attempted Save, the summary should remain visible — individual entries drop out as their fields get filled in (because the per-field requiredError naturally clears when the value becomes non-empty). Only call `resetRequired()` if you have an explicit "reset/clear form" affordance.

### 7. Don't swallow cleared values in `onChange`

Several inputs (`NumericTextInput`, `DateTimePickerInput`) can be cleared by the user — they call `onChange(undefined)` or `onChange(null)` respectively. If your handler ignores those values:

```tsx
// Bug: clearing the field is silently dropped
onChange={value => {
  if (value !== undefined) updatePatch({ rate: value });
}}
```

…the draft retains the old value while the UI shows empty. Required validation can never fire because the underlying value never becomes "missing." Always pass the cleared value through (and let `required` + the form-error system handle the empty state):

```tsx
onChange={value => updatePatch({ rate: value })}
```

The corresponding `value` prop also needs to let `undefined`/`null` pass through — avoid `value={draft.rate ?? 0}` fallbacks that re-coerce cleared inputs back to a default, since they fight the clearing and the input's internal buffer-sync will undo the user's clear.

### 8. (Optional) opt out of cleanup

For modals and short-lived forms, the default cleanup-on-unmount behaviour is what you want. For a long-lived page where errors should persist through navigation:

```tsx
const form = useForm(FORM_ID, { persist: true });
```

You're then responsible for calling `form.clear()` at the right moment.

---

## Common patterns

**Conditional required** — pass a derived boolean. The hook recomputes on every render:

```tsx
<BasicTextInput
  formError={{ formId: FORM_ID, fieldId: 'family', label: t('label.policy-family') }}
  required={!draft.policyPerson}
  ...
/>
```

When `policyPerson` is filled, `family` stops being required and its requiredError clears automatically.

**Disable Save while there are errors** — use the reactive variant:

```tsx
import { useHasErrors } from '@common/hooks';

const hasErrors = useHasErrors(FORM_ID);
return <DialogButton variant="save" disabled={hasErrors} onClick={handleSave} />;
```

**Multiple forms on one page** — give each a different `formId`. They have independent state, can be saved independently, and clean up independently when their hosts unmount.

---

## Reference implementation

[InsuranceModal.tsx](../client/packages/system/src/Patient/Insurance/InsuranceModal.tsx) exercises every feature:

| Field | Demonstrates |
|-------|--------------|
| `nameOfInsured` | plain participation, no errors |
| `policyNumberFamily` / `policyNumberPerson` | conditional required (one-of-two) |
| `policyType` / `insuranceProviderId` | `<FieldErrorWrapper>` fallback for composite Selects |
| `expiryDate` | per-field `validate` callback (date-in-past check) |
| `discountPercentage` | built-in `min`/`max` validation **plus** a cross-field `customError` with `showOnSubmit: true` (`isActive && rate === 0` blocks save, but the message is deferred until the user attempts Save so it doesn't show on a freshly opened form) |
| `isActive` | a Switch — kept out of the system entirely (booleans don't need validation) |

Walking through the modal in the browser and comparing it with the test plan in [PR #8494](https://github.com/msupply-foundation/open-msupply/pull/8494) is the fastest way to internalise the behaviour.
