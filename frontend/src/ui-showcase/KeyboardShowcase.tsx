import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import { Button } from '../ui/elements/buttons/Button';
import { CommandPaletteView } from '../ui/elements/keyboard/CommandPaletteView';
import { startKeyboardDispatcher } from '../keyboard/keyboardDispatcher';
import { registeredActions } from '../ui/utils/keyActions';
import { modifierHeld } from '../ui/utils/modifierHint';
import {
  ALT_M,
  ALT_N,
  ALT_S,
  ALT_SHIFT_M,
  CTRL_S,
  MOD_K,
  PLUS,
  ariaKeyshortcuts,
  shortcutLabel,
} from '../ui/utils/shortcuts';
import { t } from '../intl';
import { Lead, Note, Row, SectionTOC } from './common';
import type { PageMetadata } from './metadata';

/*
 * The keyboard layer's two visible pieces (spec/keyboard ui-surface S1 + S2),
 * plus a live view of the action registry.
 *
 * The registry inspector is the answer to the one real cost of a
 * declared-action registry: from a keypress you cannot grep to the entry that
 * wins, because the set is the union over whatever is mounted
 * (kdd/keyboard-layer § the honest cost is a lost reverse lookup). For a
 * dynamically-composed set, INSPECTABLE beats greppable — and the showcase is
 * already dev-only and dead-code-eliminated from production builds.
 *
 * The showcase is not an AppShell and mounts no KeyboardHost, so nothing here
 * would otherwise write modifierHeld: the badges could never reveal and the
 * live status line would permanently read "no modifier". The page therefore
 * starts the ONE real dispatcher itself for as long as it is mounted — the same
 * function KeyboardHost calls, never a second listener of its own, which would
 * be a second writer of the signal modifierHint reserves for the dispatcher.
 *
 * Only the dispatcher, not the host: no global or nav actions are registered
 * here, so the registry stays whatever this page's own components create.
 */

const DEMO_SHORTCUTS = [
  { shortcut: ALT_N, role: "The screen's add / new action" },
  { shortcut: ALT_M, role: 'Show the more-info panel' },
  { shortcut: ALT_SHIFT_M, role: 'Hide the more-info panel' },
  { shortcut: ALT_S, role: "A dialog's Save (fires from inside a field)" },
  { shortcut: MOD_K, role: 'Open the command palette' },
  { shortcut: CTRL_S, role: 'Scan a barcode' },
  { shortcut: PLUS, role: 'Add batch — a bare character, the `always` tier' },
];

const DEMO_ENTRIES = [
  { id: 'a', name: 'Go to: Dashboard', shortcut: ALT_N, run: () => {} },
  { id: 'b', name: 'Go to: Stocktakes', run: () => {} },
  { id: 'c', name: 'Go to: Inbound Shipments', run: () => {} },
  {
    id: 'd',
    name: 'Sync',
    keywords: ['refresh', 'push', 'pull'],
    run: () => {},
  },
  { id: 'e', name: 'Settings', run: () => {} },
];

export const KeyboardShowcase = () => {
  const [paletteOpen, setPaletteOpen] = createSignal(false);

  onMount(() => {
    const stop = startKeyboardDispatcher();
    onCleanup(stop);
  });

  return (
    <ContentContainer>
      <Stack gap="lg">
        <Lead>
          How a user drives the app without a mouse. The layer owns one overlay
          (the command palette) and one affordance (shortcut hint badges);
          everything else it governs is other screens' furniture.
        </Lead>
        <SectionTOC page={keyboardMetadata} />

        <DashboardCard id="keyboard-palette" title="Command palette">
          <Stack gap="md">
            <Note>
              A search-and-run overlay over every registered action. It composes{' '}
              <code>Dialog</code>, so it layers above an already-open dialog via
              the top layer. Arrows move the highlight (wrapping), Enter runs
              the highlighted action, Escape dismisses without navigating.
            </Note>
            <Row>
              <Button onClick={() => setPaletteOpen(true)}>
                Open the palette
              </Button>
            </Row>
            <CommandPaletteView
              open={paletteOpen()}
              onClose={() => setPaletteOpen(false)}
              entries={DEMO_ENTRIES}
            />
          </Stack>
        </DashboardCard>

        <DashboardCard id="keyboard-badges" title="Shortcut hint badges">
          <Stack gap="md">
            <Note>
              Hold <strong>Alt</strong> or <strong>Ctrl</strong> — here or
              anywhere in the app — and every control carrying a shortcut
              reveals it. The badge renders from the same <code>Shortcut</code>{' '}
              value the control exposes as <code>aria-keyshortcuts</code>, so
              the two cannot drift.
              {modifierHeld()
                ? ' A modifier is held right now.'
                : ' No modifier is held right now.'}
            </Note>
            <Row>
              <Button shortcut={ALT_N}>Add item</Button>
              <Button variant="secondary" shortcut={ALT_M}>
                More info
              </Button>
              <Button variant="primary" shortcut={ALT_S}>
                {t('button.save')}
              </Button>
            </Row>
            <Note>
              The badge alone, outside a control, for the two renderings of one
              value:
            </Note>
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Badge (platform-spelled)</th>
                  <th>
                    <code>aria-keyshortcuts</code>
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={DEMO_SHORTCUTS}>
                  {entry => (
                    <tr>
                      <td>{entry.role}</td>
                      <td>{shortcutLabel(entry.shortcut)}</td>
                      <td>
                        <code>{ariaKeyshortcuts(entry.shortcut)}</code>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Stack>
        </DashboardCard>

        <DashboardCard id="keyboard-registry" title="Action registry (live)">
          <Stack gap="md">
            <Note>
              Every action registered right now. The set is the union over
              whatever is mounted, so this is the reverse lookup a grep cannot
              give you: which entry a keypress resolves to, and in what order.
              Last registered wins, so a nested surface shadows the screen
              beneath it.
            </Note>
            <Show
              when={registeredActions().length > 0}
              fallback={
                <Note>
                  Nothing registered — the showcase mounts no AppShell or
                  KeyboardHost, so only actions created by components on this
                  page appear.
                </Note>
              }
            >
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Binding</th>
                    <th>Disabled</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={registeredActions()}>
                    {(action, index) => (
                      <tr>
                        <td>{index() + 1}</td>
                        <td>
                          {action.name === undefined
                            ? '— (unlisted)'
                            : t(action.name)}
                        </td>
                        <td>
                          {action.shortcut
                            ? shortcutLabel(action.shortcut)
                            : '—'}
                        </td>
                        <td>{action.disabled?.() === true ? 'yes' : 'no'}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </Stack>
        </DashboardCard>
      </Stack>
    </ContentContainer>
  );
};

export const keyboardMetadata: PageMetadata = {
  id: 'keyboard',
  title: 'Keyboard',
  searchTerms: [
    'shortcut',
    'hotkey',
    'command palette',
    'cmdk',
    'binding',
    'accelerator',
  ],
  items: [
    {
      id: 'keyboard-palette',
      title: 'Command palette',
      searchTerms: ['cmdk', 'search', 'run', 'overlay'],
    },
    {
      id: 'keyboard-badges',
      title: 'Shortcut hint badges',
      searchTerms: ['badge', 'hint', 'alt', 'modifier', 'aria-keyshortcuts'],
    },
    {
      id: 'keyboard-registry',
      title: 'Action registry (live)',
      searchTerms: ['registry', 'actions', 'inspector', 'debug'],
    },
  ],
};
