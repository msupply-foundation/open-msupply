import { For } from 'solid-js'
import { AppShell } from '../components/layout/AppShell/AppShell'
import styles from './PageLayoutShowcase.module.css'

/* Deterministic placeholder rows — enough to make the body scroll. */
const STATUSES = [
  { label: 'New', color: 'var(--gray-main)' },
  { label: 'Picked', color: 'var(--color-warning)' },
  { label: 'Shipped', color: 'var(--secondary-main)' },
  { label: 'Delivered', color: 'var(--primary-main)' },
]
const CUSTOMERS = [
  'Buka Rural Hospital',
  'Arawa Health Centre',
  'Kokopo District Store',
  'Wewak Provincial Hospital',
  'Mount Hagen Clinic',
  'Lae Urban Aid Post',
]

const ROWS = Array.from({ length: 16 }, (_, i) => ({
  reference: `OS-${(1024 + i).toString().padStart(6, '0')}`,
  customer: CUSTOMERS[i % CUSTOMERS.length],
  status: STATUSES[i % STATUSES.length],
  items: 3 + ((i * 7) % 22),
  created: `2026-07-${(1 + (i % 28)).toString().padStart(2, '0')}`,
}))

/*
 * Demonstrates the AppShell layout element as a full page. It's rendered
 * full-bleed by the showcase (kind: 'page'); resize the window to watch the
 * docked sidebar collapse to a hamburger overlay at the navOverlay breakpoint.
 */
export const PageLayoutShowcase = () => (
  <AppShell>
    {(selected) => (
      <div class={styles.page}>
        <p class={styles.note}>
          Whole-page layout demo. Resize the window (or use the device toolbar) —
          the docked sidebar becomes a hamburger overlay below 1024px, and the
          whole UI shrinks below 600px. Pick a sidebar item to see the header
          breadcrumb update.
        </p>

        <div class={styles.toolbar}>
          <span class={styles.count}>
            {ROWS.length} {selected.label.toLowerCase()}
          </span>
          <div class={styles.filters}>
            <For each={STATUSES}>
              {(s) => (
                <button type="button" class={styles.filterPill}>
                  <span class={styles.dot} style={{ background: s.color }} aria-hidden="true" />
                  {s.label}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class={styles.tableWrap}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Reference</th>
                <th>Customer</th>
                <th class={styles.numeric}>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <For each={ROWS}>
                {(row) => (
                  <tr>
                    <td>
                      <span class={styles.status}>
                        <span
                          class={styles.dot}
                          style={{ background: row.status.color }}
                          aria-hidden="true"
                        />
                        {row.status.label}
                      </span>
                    </td>
                    <td class={styles.mono}>{row.reference}</td>
                    <td>{row.customer}</td>
                    <td class={styles.numeric}>{row.items}</td>
                    <td class={styles.muted}>{row.created}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    )}
  </AppShell>
)
