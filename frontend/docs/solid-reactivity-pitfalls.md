# SolidJS reactivity pitfalls

A checklist of the ways SolidJS reactivity silently breaks, for humans and LLMs
writing or reviewing code in this repo. Each pitfall states the broken pattern,
the fix, and the one-line reason. Sourced from the official SolidJS tutorial
(https://www.solidjs.com/tutorial/), condensed; remount-specific rules live in
[`kdd/no-remounts`](../kdd/no-remounts/draft-kdd.md).

**The mental model behind all of these:** a component function runs **once**.
There is no re-render. The compiler wraps JSX expressions (and prop values) in
tiny effects; only code inside a _tracking scope_ — a JSX expression, `createEffect`,
`createMemo`, or a function called from one — re-runs when a signal it read changes.
Any signal read outside a tracking scope is a one-time snapshot.

---

## 1. Reading a signal outside a tracking scope

```tsx
// BROKEN — count() read once at setup; `label` never updates
const label = `Count: ${count()}`;
return <div>{label}</div>;

// FIXED — a derived signal: a function re-read inside the JSX tracking scope
const label = () => `Count: ${count()}`;
return <div>{label()}</div>;
```

A value derived from a signal must stay a **function** all the way to the place
it's used. If it's expensive to compute or read in many places, wrap it in
`createMemo` (see §7).

Corollary: `if`/early-return in the component body on a signal value is a
one-time decision. Branch in JSX with `<Show>` / `<Switch>` instead.

## 2. Destructuring (or spreading) `props`

```tsx
// BROKEN — reads happen at destructure time; updates are lost
function Greeting({ greeting, name }) { ... }
const { greeting } = props;
const copy = { ...props };            // same problem
const merged = Object.assign({}, defaults, props); // same problem

// FIXED — keep the props object intact; access properties at use-site
function Greeting(props) {
  return <h3>{props.greeting} {props.name}</h3>;
}
```

Props are getters — the compiler defers evaluation to the property access.
Destructure/spread/`Object.assign` invokes every getter once, outside any
tracking scope. Use:

- `mergeProps({ greeting: "Hi" }, props)` — reactive defaults
- `splitProps(props, ["greeting", "name"])` — reactive grouping (e.g. local vs pass-through)

## 3. Reading a JSX-element prop more than once (`children`, `icon`, …)

`props.children` is a lazy getter — but so is **every** prop whose value is
JSX. `children` is only special in that it's the prop the compiler fills from
nested content; the hazard belongs to the getter mechanism, not the prop name:

```tsx
<Button icon={<CheckIcon />}>Save</Button>;

// compiles to roughly:
createComponent(Button, {
  get icon() {
    return createComponent(CheckIcon, {});
  },
  get children() {
    return 'Save';
  },
});
```

Every access of `props.icon` re-runs that getter and builds a **brand-new**
element (`splitProps` preserves getters, so `local.icon` behaves identically).
A truthiness test plus an insertion is already two creations — the test's copy
is discarded, but it still _executed_: a `ref` on the passed element would end
up pointing at the detached copy, an `onMount` would fire twice.

```tsx
// BROKEN — two CheckIcons created per evaluation; the <Show> test's is discarded
<Show when={props.icon}>
  <span class={styles.icon}>{props.icon}</span>
</Show>;

// FIXED — resolve once with the children() helper, read the memo everywhere
const icon = children(() => props.icon);
<Show when={icon()}>
  <span class={styles.icon}>{icon()}</span>
</Show>;
```

The `children` helper works for any JSX-valued prop, not just `children`; it
memoizes the resolution and unwraps nested reactive references (so you can also
inspect/iterate the result, e.g. `resolved().forEach(...)` in an effect).
Inserting a JSX prop **exactly once** into JSX needs no helper.

Standing rule for this repo:
[`kdd/jsx-prop-single-read`](../kdd/jsx-prop-single-read/draft-kdd.md).

## 4. `array.map()` in JSX instead of `<For>` / `<Index>`

`{items().map(item => <li>…</li>)}` re-creates **every** node whenever the
array changes — there's no virtual DOM to diff away the waste. Use:

- `<For each={items()}>` — keyed **by reference**. Rows move with their object;
  the item is a plain value, the index is a signal `i()`.
- `<Index each={items()}>` — keyed **by position**. The item is a signal
  `item()`, the index is a constant. Use for arrays of **primitives** (strings,
  numbers) or fixed-position lists, where `<For>`'s reference keying would
  tear nodes down on every value change.

Rule of thumb from the tutorial: objects → `<For>`, primitives → `<Index>`.

## 5. Replacing objects to "update" one field

```tsx
// BROKEN under <For> — new object reference ⇒ row torn down and rebuilt
setTodos(
  todos().map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
);

// FIXED — store with path syntax updates one leaf; the row keeps its identity
const [todos, setTodos] = createStore<Todo[]>([]);
setTodos(
  t => t.id === id,
  'completed',
  done => !done
);
```

Nested reactivity is what stores are for: each accessed property lazily becomes
its own signal, so a leaf write re-runs only that field's binding. For mutation-
style updates use `produce`; this repo's binding rule (editable collections are
stores, updated field-by-field, matched by stable id — never index) is in
[`kdd/no-remounts`](../kdd/no-remounts/draft-kdd.md).

## 6. Setting a store from an external/immutable source without `reconcile`

`setStore(externalSnapshot)` doesn't diff — Solid assumes granular writes, so a
wholesale replacement counts as all-new data and re-creates the DOM under it.
When mirroring data that arrives as fresh immutable snapshots (a reducer, an
external subscription, refetched query data you merge into existing UI):

```tsx
setState(reconcile(store.getState()));
```

`reconcile` diffs the snapshot against the store and notifies only real changes
(configurable `key`, default `"id"`).

## 7. Effects that write signals, when a memo would do

```tsx
// BROKEN-ish — extra write, extra update wave, risk of cycles
createEffect(() => setDouble(count() * 2));

// FIXED
const double = createMemo(() => count() * 2);
```

**What can be derived, should be derived.** A memo is both observer and signal,
knows its dependents, and runs exactly once per change. Reserve `createEffect`
for true side effects (DOM interop, logging, subscriptions). Plain derived
functions (§1) re-compute on every read — reach for `createMemo` when the
computation is expensive or fans out to many readers.

## 8. Expecting event handlers to be reactive

`on…` handlers are bound **once** — the expression is not wrapped in an effect.
`onClick={flag() ? a : b}` picks a handler at mount and never re-picks. Branch
_inside_ the handler on current state instead. Also:

- Delegated `on` names are case-insensitive (`onMouseMove` → `mousemove`);
  use the `on:` namespace for exact-case/non-delegated events.
- Delegated handlers support the `[handler, data]` tuple form to avoid closures.

## 9. Forgetting `onCleanup`

Anything registered in a component or effect body — `setInterval`, event
listeners on `document`/`window`/`body`, external subscriptions — outlives the
scope unless released:

```tsx
const timer = setInterval(() => setCount(c => c + 1), 1000);
onCleanup(() => clearInterval(timer));
```

`onCleanup` works in any reactive scope (component, effect, custom directive)
and runs both on re-evaluation and on disposal.

## 10. Suspense triggers on _read_, and refetches collapse the boundary

It's the **read** of a pending resource under a `<Suspense>` that suspends —
not the fetch itself. Consequences:

- An unread resource never suspends anything.
- A resource that refetches while the screen stays open will swap the whole
  boundary back to its fallback, unmounting live forms. Read `resource.latest`
  or gate on `resource.loading` for refetching reads; reserve suspending
  `resource()` reads for initial load ([`kdd/no-remounts`](../kdd/no-remounts/draft-kdd.md) rule 1).
- For navigation between suspending views, `useTransition` keeps the current
  branch on screen while the next renders off-screen.

## 11. Effects run _after_ render — and other timing traps

- `createEffect` runs after rendering completes; use it for post-DOM work.
  `onMount` is just a non-tracking effect that runs once. For DOM writes that
  must land _before_ paint, use `createRenderEffect`.
- Solid updates synchronously — the DOM is updated by the next line after a
  `set`. Wrap related multi-signal writes in `batch(() => { … })` to notify
  observers once (setters inside events already batch).
- Need explicit dependencies? `on(a, (a) => …, { defer: true })` tracks only
  `a` and can skip the initial run. Need to read without tracking? `untrack(b)`
  (writes inside `untrack` still notify).

## 12. Global-scope computations and global state

Signals work anywhere — global signal modules are legitimate. But
`createEffect`/`createMemo` created **outside** a root are never disposed (they
live for the app's lifetime), and module-level state is shared across requests
under SSR. This repo is client-rendered and uses resource-signal global state
deliberately — see [`kdd/state-management`](../kdd/state-management/draft-kdd.md).

---

## Appendix: binding gotchas (not reactivity, still bite)

- **`style` objects** wrap `style.setProperty`: dash-case keys
  (`"font-size"`, not `fontSize`), explicit units (`"500px"`, not `500`), and
  CSS variables (`"--my-color"`) work.
- **`classList`** takes `{ className: boolean }` — prefer it over ternary
  string-building for conditional classes.
- **`use:` directives** are compiler-detected: the function must be imported in
  scope, and they don't work through spreads or on components.
- **`ref`** assigns before the element is attached to the document; use
  `onMount` if you need it attached.
- **JSX ≠ HTML**: no void elements (self-close `<input />`), one root element
  (use `<>…</>`), no HTML comments.
