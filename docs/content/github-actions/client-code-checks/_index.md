+++
title = "Client Code Checks"
weight = 20
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Client Code Checks

This GitHub Actions workflow ensures that the client-side code is correctly formatted, free of linting errors, and successfully recompiled.

## Triggering the Workflow

The workflow runs automatically on pull requests that modify files in the `client` directory. It can also be triggered manually if needed.

## Handling Linting Warnings

Some areas of the codebase may generate linting warnings, which could cause the `prettier` check in GitHub Actions to return an error. This is expected and can be ignored.

### Example Output

On a successful run, the workflow will output a result similar to this:
![Successful run output](https://github.com/user-attachments/assets/e66fa96a-cc20-445a-89a3-6fdaecf58cb7)

### Error Output

When it fails it'll tell you what file specifically needs fixing. But as you go through it, you'll be greeted by a sea of warnings.

It's OKAY to ignore these and just fix the files with the errors. The warnings requires further discussion on how we'll support some of them.

![Error output with warnings](https://github.com/user-attachments/assets/52dbbddd-9a7d-4cf9-a8cb-673edfbbc77f)


## Common Linting Warnings

In some cases, you may encounter linting warnings in your code.

A common example involves the dependency array in `useEffect`. ESLint rules can be strict about dependencies, but real-world use cases sometimes require omitting certain dependencies.

If a `useEffect` is functioning correctly without the suggested dependencies, you can safely suppress the warning using an ESLint directive:

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
```

Before ignoring a warning, check if it actually matters. If the suggested fix isn't needed, you can progress without working on it or suppress it.

## ESLint Version

Currently running on version `^8.50.0`. This is behind the latest version of ESLint. Need to work on migrating it to the latest version.


## Prettier

To make life easier and to get rid of the big list of warnings for this GitHub Action, please ensure that you have Prettier set as your formatter when auto-saving.

### Configure Prettier on Auto Save

1. **Set Prettier as Default Formatter**
   - Open VS Code settings (`Ctrl + ,` or `Cmd + ,` on Mac).
   - Search for `"editor.defaultFormatter"` and select `"Prettier - Code formatter"`.

2. **Enable Format on Save**
   - In VS Code settings, search for `"editor.formatOnSave"`.
   - Ensure it is checked (`true`).

Our Prettier config is set up under `.prettierrc` in the `client` directory.

Can also just grab this code snippet and add to your `settings.json` for VSCode.

```
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true
  },
```

💡 *Note: Prettier only affects `client` directory.* 🚀
