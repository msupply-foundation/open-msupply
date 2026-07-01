import { useState } from 'react';
import type { ReactNode } from 'react';
import { NativeSelect } from '@/components/ui/NativeSelect';
import { Select } from '@/components/ui/Select';
import { Combobox } from '@/components/ui/Combobox';
import { MultiSelect } from '@/components/ui/MultiSelect';
import {
  ITEMS,
  PACK_UNITS,
  INVOICE_STATUSES,
  type DemoItem,
} from './selectorData';
import styles from './SelectorsShowcase.module.css';

const Card = ({
  title,
  lead,
  children,
}: {
  title: string;
  lead: ReactNode;
  children: ReactNode;
}) => (
  <section className={styles.card}>
    <header className={styles.cardHeader}>{title}</header>
    <div className={styles.cardBody}>
      <p className={styles.lead}>{lead}</p>
      {children}
    </div>
  </section>
);

/* A coloured status dot — the kind of rich option a native <option> can't hold. */
const Dot = ({ color }: { color: string }) => (
  <span className={styles.dot} style={{ background: color }} aria-hidden />
);

/* Two-line item option: name on top, code + stock beneath. */
const renderItem = (item: DemoItem) => (
  <span className={styles.itemRow}>
    <span className={styles.itemName}>{item.name}</span>
    <span className={styles.itemMeta}>
      {item.code}
      {' · '}
      {item.availableStock > 0 ? (
        <>{item.availableStock.toLocaleString()} in stock</>
      ) : (
        <span className={styles.outOfStock}>Out of stock</span>
      )}
    </span>
  </span>
);

const itemLabel = (item: DemoItem | null) => (item ? item.name : '');

// Match either the item name or its code, case-insensitively.
const itemFilter = (items: DemoItem[], input: string) => {
  const needle = input.toLocaleLowerCase();
  return items.filter(
    item =>
      item.name.toLocaleLowerCase().includes(needle) ||
      item.code.toLocaleLowerCase().includes(needle)
  );
};

export const SelectorsShowcase = () => {
  const [status, setStatus] = useState('allocated');
  const [picked, setPicked] = useState<DemoItem | null>(null);
  const [multi, setMulti] = useState<DemoItem[]>([ITEMS[0], ITEMS[2]]);

  return (
    <div className={styles.stack}>
      <Card
        title="Plain drop-down — native <select>"
        lead={
          <>
            The simplest selector, and the default. For a short, fixed enum the
            browser already gives us keyboard support, type-ahead and the
            OS-native picker on tablets — for zero JS. We own it.
          </>
        }
      >
        <NativeSelect
          label="Pack unit"
          options={PACK_UNITS}
          placeholder="Choose a unit…"
          helperText="Native picker — try it on a touch device"
        />
      </Card>

      <Card
        title="Styled drop-down — Radix Select"
        lead={
          <>
            Same job — pick one from a fixed list — but the options carry a
            status colour a native <code>&lt;option&gt;</code> can’t render. Radix
            Select buys the listbox a11y contract; the look is entirely ours.
          </>
        }
      >
        <Select
          label="Invoice status"
          value={status}
          onValueChange={setStatus}
          options={INVOICE_STATUSES.map(s => ({
            value: s.value,
            label: s.label,
            adornment: <Dot color={s.color} />,
          }))}
          helperText="Coloured dots + check indicator — styled, still accessible"
        />
      </Card>

      <Card
        title="Autocomplete / combobox — Downshift"
        lead={
          <>
            The flagged hard widget: type to filter a large item list and pick
            one. Filters on <strong>code or name</strong>, renders a two-line
            option, and is clearable. This is the real outbound-shipment item
            picker.
          </>
        }
      >
        <Combobox<DemoItem>
          label="Add item"
          items={ITEMS}
          itemToString={itemLabel}
          filter={itemFilter}
          renderItem={renderItem}
          onChange={setPicked}
          placeholder="Search by item code or name…"
          helperText={
            picked
              ? `Selected: ${picked.code} — ${picked.name}`
              : 'Try “amox”, “500”, or a code like “ORS20”'
          }
        />
      </Card>

      <Card
        title="Multi-select autocomplete — Downshift"
        lead={
          <>
            The many-value sibling: pick several items, each a removable tag.
            Backspace removes the last; already-picked items drop out of the
            list. Maps to the app’s <code>AutocompleteMulti</code>.
          </>
        }
      >
        <MultiSelect<DemoItem>
          label="Items on this master list"
          items={ITEMS}
          itemToString={item => item.code}
          selectedItems={multi}
          onChange={setMulti}
          renderItem={renderItem}
          placeholder="Search to add items…"
          helperText={`${multi.length} selected`}
        />
      </Card>
    </div>
  );
};
