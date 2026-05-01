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

### Three error kinds

Each field independently tracks three slots, with display precedence **`custom > invalid > required`**:

| Kind | Source | Visible when |
|------|--------|--------------|
| `custom` | `customError` prop on the input, or `setCustomError(msg)` called imperatively | always |
| `invalid` | `validate(value)` callback, or set by the input component itself (e.g. `NumericTextInput`'s built-in min/max) | always |
| `required` | derived from `required && !value` | only after the form's `showRequired` flag is set (i.e. user has attempted Save) |

Because the slots are independent, clearing a custom error reveals the underlying validation error rather than leaving the field looking valid when it isn't.

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

### `<FormIdProvider formId={...}>` &nbsp;— optional ergonomics

A tiny string-only Context that provides `formId` to descendant inputs so they don't all need to repeat it. The Context contains no state — it's purely prop-drilling avoidance. You can ignore it and pass `formId` explicitly on each input if you prefer.

### `formError` prop &nbsp;— input-side

Any input that has been opted into the system accepts:

```tsx
formError={{
  formId?: string,    // optional if a <FormIdProvider> is in the tree
  fieldId: string,    // unique within the form
  label: string,      // shown in the error summary
}}
customError?: string | null
```

Currently supported on `BasicTextInput`, `NumericTextInput`, `DateTimePickerInput`. (`Autocomplete` accepts a top-level `error: boolean` that you'd typically feed from `<FieldErrorWrapper>` rather than `formError` directly, since the wrapper sees the actual selected value.)

When `formError` is omitted the input behaves exactly as before — opt-in is the default.

#### Special case: `NumericTextInput`

When `formError` is set, `NumericTextInput` skips its usual clamp-to-`min`/`max` behaviour and surfaces violations through the form-error system instead — matching the goal of "allow illegal input but flag it." Without `formError` the legacy clamping is preserved.

#### Special case: `DateTimePickerInput`

`error` was widened from `ReactNode` to `boolean`. Use the new `errorText: ReactNode` prop where you previously passed a string into `error` to drive the `helperText` display.

---

## Implementation guide — adding the system to a form

### 1. Pick a `formId`

Any unique string. Convention: kebab-case, descriptive. E.g. `'create-patient'`, `'edit-immunisation-course'`.

### 2. Wrap the form body in `<FormIdProvider>` and call `useForm`

```tsx
const FORM_ID = 'my-form';

const MyFormContent = () => {
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

export const MyForm = () => (
  <FormIdProvider formId={FORM_ID}>
    <MyFormContent />
  </FormIdProvider>
);
```

### 3. Wire each field

For inputs with native support (`BasicTextInput`, `NumericTextInput`, `DateTimePickerInput`), add the `formError` prop:

```tsx
<BasicTextInput
  formError={{ fieldId: 'patientName', label: t('label.patient-name') }}
  required
  value={draft.patientName}
  onChange={e => updatePatch({ patientName: e.target.value })}
/>
```

For composite components (custom Selects, Autocompletes, third-party widgets), use `<FieldErrorWrapper>`:

```tsx
<FieldErrorWrapper
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

**Reactive prop** — use when the rule is a pure function of the current draft:

```tsx
<NumericTextInput
  formError={{ fieldId: 'discount', label: t('label.discount') }}
  customError={draft.discount > 110 ? t('messages.way-too-big') : null}
  min={0}
  max={100}
  ...
/>
```

**`validate` callback** — use when the rule is per-input, returns a message based on the value, and you don't want to rebuild the message every render:

```tsx
<DateTimePickerInput
  formError={{ fieldId: 'expiry', label: t('label.expiry') }}
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

### 7. (Optional) opt out of cleanup

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
  formError={{ fieldId: 'family', label: t('label.policy-family') }}
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
| `policyNumberPerson` | reactive `customError` (`'666'` triggers a custom message) |
| `policyType` / `insuranceProviderId` | `<FieldErrorWrapper>` fallback for composite Selects |
| `expiryDate` | per-field `validate` callback (date-in-past check) |
| `discountPercentage` | built-in `min`/`max` validation **plus** reactive `customError` (>110 triggers a custom message), demonstrating the `custom > invalid` precedence |
| `isActive` | a Switch — kept out of the system entirely (booleans don't need validation) |

Walking through the modal in the browser and comparing it with the test plan in [PR #8494](https://github.com/msupply-foundation/open-msupply/pull/8494) is the fastest way to internalise the behaviour.
