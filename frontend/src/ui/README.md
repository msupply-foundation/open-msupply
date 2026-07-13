# UI Components Guidelines

**Showcase** access: http://localhost:3005/#/showcase

**Component standards**: https://msupply-foundation.github.io/ui-standards/


- No dedicated underling UI library
- Components styled using CSS Modules
- Common "themeable" elements used across all components are CSS Variables, and all listed in `tokens.css`
- Components built from HTML building blocks
- Except for ones that require complex functionality, such as AutoComplete/Combobox
  - This is also for accessibility, which is very difficult to do fully for components like this
  - Mostly using the [Kobalte](https://kobalte.dev/docs/core/overview/introduction/) components
  - Additional library components are all unstyled (and this should be a pre-requisite for any additional components going forward)

## Repo Structure

- components sit next to their associated `module.css` file, which contains its styles
- there is also an auto-generated `.d.ts` file for each, which enforces type safety in the component (can't refer to a class that doesn't exist)
- components are divided into `elements` and `layout`
- Global styles (including theme tokens) within `/styles
- icons are currently all defined in one large `/icons/index.tsx` file, but we may break these out into one file per icon

## Type safety

- When launching with `pnpm dev` the [`typed-css-modules`](https://github.com/Quramy/typed-css-modules) package auto-generates `.d.ts` files so you get hot reloading of style types as you work
- Full checks with `pnpm check`:
  - [`stylelint`](https://stylelint.io/) ensures any `--var` used in the app is defined in `tokens.css` (along with a bunch of standard validations, such as invalid colour values, etc)
  - `check-theme-tokens.mjs` ensures all `[data-theme]` block define all tokens

## Working with the UI

- Ideally, you won't need to think about styling when constructing pages with standard patterns
- The top-most component is the `Page`, which in turn composes `Header`, `ContentFooter` and `SidePanel`, with the main page content being its `children`. The textbook example so far is `StocktakesList`.
- Since we are in early stages, new components will need to be built (and refined). Please follow (or make sure Claude follows) the patterns established here, and the org's [UI standards](https://msupply-foundation.github.io/ui-standards/)
- Any UI work should be done in its own PR (for now), unless it's coupled to functional changes. I'll review them during the initial phase to ensure consistency and no duplication
- Make sure the ui area's `CLAUDE.md` file is kept up to date

### Strict rules
 - No hard-coded colours, always semantic, with reference to theme tokens
 - Always check mobile/responsive layout, particularly tablet in portrait mode
 - Sizing never in px, mostly rem, sometimes em (except border thickness and few other small things)
 - Any new components need to be added to the "Showcase"

## Components list

See [UI_ELEMENTS.md](./docs/UI_ELEMENTS.md)

### Components that need adding or significantly refining in the near future

- [ ] Pagination
- [ ] Table structural elements
- [ ] Table cells (add here individually as required)
- [ ] Modal (container) (will probably be a composed structure like `Page`)

## More detail
Available in `ui/docs` and see key decisions made in `kdd/ui-styling/draft-kdd.md`

## Themeing
- To do
