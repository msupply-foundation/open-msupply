## common/ui/components/modals/InputModal

### Overview

Modal components for inputting data / Form dialogs.

### Intentions

This use case for this collection of components is primarily for updating a simple field which has large side effects, such that an optimistic mutation is error prone and would be ideal to avoid and discourage a user from spamming / changing frequently

For example, changing the tax value for an entire invoice results in all lines and totals having updated values. Using a modal it is less error prone to have the server do the work and receive the updates back to re-render.

### Tips & Things to keep in mind

- Try to avoid using these components where possible. It's a far better user experience to not use a modal i.e. for a comment.
- If the updated field has no side effects (i.e. all )

### Future considerations

- Creating a context provider similar to `ConfirmationModalProvider` would make the use of these components very easy.
