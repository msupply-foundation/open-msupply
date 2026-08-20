import { createMemo, createSignal, Show } from 'solid-js';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { TextField } from '../../ui/elements/inputs/TextField';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { Checkbox } from '../../ui/elements/inputs/Checkbox';
import { Select } from '../../ui/elements/selectors/Select';
import { MultiSelect } from '../../ui/elements/selectors/MultiSelect';
import { FormColumns } from '../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../ui/layout/Form/FormColumn';
import { FormSection } from '../../ui/layout/Form/FormSection';
import { FormRow } from '../../ui/layout/Form/FormRow';
import { CatalogueIcon } from '../../ui/icons';
// The real items vertical's own location-type label, so the temperature range
// reads identically here and on the item-variant modal (one definition, not two).
import { locationTypeLabel } from '../../sections/items/detail/itemVariantEdit';
import styles from './catalogueItems.module.css';

/*
 * Add item — the create form for a central catalogue item.
 *
 * A Dialog, not a page: a short focused task on ONE record (ui-standards §
 * modals). `width="form"` is the two-column form measure, so it matches an
 * in-page form of the same kind and picks up the shared full-screen treatment
 * below the narrow-viewport line for free.
 *
 * Four labelled FormSections in ONE scrolling body rather than a wizard — the
 * whole record stays visible, which is what stops "what did I already fill
 * in?". Sections take h3 because the Dialog's own title holds the h2.
 *
 * PROTOTYPE — nothing is saved. The item record is central data entry, which
 * this app's items vertical deliberately does not own (spec/items § Scope:
 * "Item records themselves are maintained in central data entry outside this
 * app"). See the header comment in CatalogueItemsPrototype.tsx.
 */

/** Codes already in the demo catalogue — the live uniqueness check reads these. */
export interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  /** Existing item codes, so the code field can flag a duplicate as you type. */
  takenCodes: { code: string; name: string }[];
  /** Master lists offered by the picker. */
  masterLists: string[];
  /** Facilities each of those lists reaches, for the picker's helper text. */
  reachOf: (lists: string[]) => number;
  /** Total facilities the catalogue serves — the scope note's denominator. */
  facilityCount: number;
}

const TYPE_OPTIONS = [
  { value: 'stock', label: 'Stock — held and counted' },
  { value: 'service', label: 'Service — charged, no stock' },
  { value: 'nonstock', label: 'Non-stock — ordered on demand' },
];

const UNIT_OPTIONS = [
  'Tablet',
  'Capsule',
  'Vial',
  'Ampoule',
  'Bottle',
  'mL',
  'Each',
].map(u => ({ value: u, label: u }));

const VEN_OPTIONS = [
  { value: 'V', label: 'V — Vital' },
  { value: 'E', label: 'E — Essential' },
  { value: 'N', label: 'N — Non-essential' },
  { value: '', label: 'Not set' },
];

/*
 * Item categories. The schema models these as a FLAT list
 * (`categories: [ItemCategoryNode!]!`, which is just id + name — no parent), so
 * this is a multi-select, not the legacy desktop's Category 1 / 2 / 3 tiers.
 * Whether open mSupply should carry that hierarchy is an open question on the
 * prototype's card, not something to invent here.
 */
const CATEGORIES = [
  'Cardiovascular',
  'Diuretics',
  'Anti-infectives',
  'Vaccines',
  'Consumables',
];

/*
 * Location types for "Restricted to" (`restrictedLocationTypeId`). Labelled with
 * the real vertical's own helper so the temperature range reads exactly as it
 * does on the item-variant modal, rather than a second format invented here.
 *
 * This REPLACES an invented "Storage temperature" select: the schema has no such
 * field, and a location type already carries min/max temperature. It also applies
 * to any stock item (legacy puts it on the General tab), not just vaccines, so it
 * sits outside the vaccine block.
 */
const LOCATION_TYPES = [
  { id: 'cold', name: 'Cold room', minTemperature: 2, maxTemperature: 8 },
  { id: 'freezer', name: 'Freezer', minTemperature: -25, maxTemperature: -15 },
  { id: 'ultra', name: 'Ultra-cold freezer', minTemperature: -80, maxTemperature: -60 },
  { id: 'ambient', name: 'Ambient store', minTemperature: 15, maxTemperature: 25 },
];

const LOCATION_TYPE_OPTIONS = LOCATION_TYPES.map(lt => ({
  value: lt.id,
  label: locationTypeLabel(lt),
}));

export const AddItemModal = (props: AddItemModalProps) => {
  const [name, setName] = createSignal('');
  const [code, setCode] = createSignal('');
  const [type, setType] = createSignal('stock');
  const [unit, setUnit] = createSignal('Tablet');
  const [packSize, setPackSize] = createSignal<number | undefined>(1);
  const [strength, setStrength] = createSignal('');
  const [isVaccine, setIsVaccine] = createSignal(false);
  const [doses, setDoses] = createSignal<number | undefined>(undefined);
  const [volume, setVolume] = createSignal<number | undefined>(undefined);
  const [categories, setCategories] = createSignal<string[]>(['Diuretics']);
  const [weight, setWeight] = createSignal<number | undefined>(undefined);
  const [restrictedTo, setRestrictedTo] = createSignal('');
  const [ven, setVen] = createSignal('E');
  const [atc, setAtc] = createSignal('');
  const [universalCode, setUniversalCode] = createSignal('');
  const [lists, setLists] = createSignal<string[]>([]);
  const [active, setActive] = createSignal(true);

  /*
   * Live uniqueness check. A duplicate item code is effectively unrecoverable
   * once it has synced to every store, so this is the one error worth
   * surfacing before submit — and it names the record it collides with rather
   * than just saying "taken".
   */
  const codeClash = createMemo(() => {
    const entered = code().trim().toLowerCase();
    if (!entered) return undefined;
    return props.takenCodes.find(i => i.code.toLowerCase() === entered);
  });

  // A service item has no unit, pack size or dosing — the whole band is
  // dropped rather than ten inputs disabled: an absent band teaches that it
  // does not apply, a greyed one teaches nothing.
  const isStocked = () => type() !== 'service';

  const canCreate = () =>
    name().trim().length > 0 &&
    code().trim().length > 0 &&
    codeClash() === undefined &&
    (!isStocked() || unit().length > 0) &&
    (!isVaccine() || (doses() ?? 0) > 0);

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title="New item"
      icon={<CatalogueIcon />}
      width="form"
      description={`Will be added to the central catalogue and sync to all ${props.facilityCount} facilities`}
      actionsAlign="end"
      actions={
        <>
          <Button variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          {/* Manual catalogue entry is almost never one item, so the
              repeat-entry path is a first-class action rather than a
              close-and-reopen. */}
          <Button variant="secondary" disabled={!canCreate()}>
            Create and add another
          </Button>
          <Button disabled={!canCreate()}>Create item</Button>
        </>
      }
    >
      <FormColumns>
        <FormColumn>
          <FormSection title="Identity" headingLevel="h3" heading="group">
            <TextField
              label="Item name"
              required
              value={name()}
              onInput={e => setName(e.currentTarget.value)}
              placeholder="e.g. Amoxicillin 250mg capsules"
              helperText="Generic name, strength, then form — what dispensers search on."
            />
            <TextField
              label="Item code"
              required
              value={code()}
              onInput={e => setCode(e.currentTarget.value)}
              error={
                codeClash()
                  ? `Already used by ${codeClash()?.name}. Codes must be unique across all stores.`
                  : undefined
              }
              helperText={
                codeClash()
                  ? undefined
                  : 'Used in orders, labels and every import file.'
              }
            />
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={type()}
              onValueChange={setType}
              required
            />
          </FormSection>

          <Show when={isStocked()}>
            <FormSection
              title="Packaging & dosing"
              headingLevel="h3"
              heading="group"
            >
              <FormRow>
                <Select
                  label="Unit"
                  options={UNIT_OPTIONS}
                  value={unit()}
                  onValueChange={setUnit}
                  required
                  helperText="Maintained centrally"
                />
                <NumberField
                  label="Default pack size"
                  value={packSize()}
                  onChange={setPackSize}
                  min={1}
                />
              </FormRow>
              <FormRow>
                <TextField
                  label="Strength"
                  value={strength()}
                  onInput={e => setStrength(e.currentTarget.value)}
                  placeholder="e.g. 250mg"
                />
                <NumberField
                  label="Default weight (kg)"
                  value={weight()}
                  onChange={setWeight}
                  min={0}
                  decimalLimit={3}
                  helperText="Of the default pack"
                />
              </FormRow>
              {/* Applies to any stock item, not just vaccines — so it sits
                  outside the vaccine block, as it does on legacy's General tab.
                  Stock can then only be received into a matching location. */}
              <Select
                label="Restricted to"
                options={LOCATION_TYPE_OPTIONS}
                value={restrictedTo()}
                onValueChange={setRestrictedTo}
                placeholder="Not restricted"
                helperText="Limits which location types this item may be stored in"
              />
              {/* Legacy mSupply defaults Doses to 1 the moment this is ticked,
                  so the required field is never left empty for the user to
                  discover on save. Matched here. */}
              <Checkbox
                label="This is a vaccine"
                checked={isVaccine()}
                onChange={checked => {
                  setIsVaccine(checked);
                  if (checked && doses() === undefined) setDoses(1);
                }}
              />
              <Show when={isVaccine()}>
                <div class={styles.conditional}>
                  <FormRow>
                    <NumberField
                      label="Doses per unit"
                      required
                      value={doses()}
                      onChange={setDoses}
                      min={1}
                    />
                    <NumberField
                      label="Volume per dose (mL)"
                      value={volume()}
                      onChange={setVolume}
                      min={0}
                      decimalLimit={2}
                    />
                  </FormRow>
                </div>
              </Show>
            </FormSection>
          </Show>
        </FormColumn>

        <FormColumn>
          <FormSection title="Classification" headingLevel="h3" heading="group">
            <FormRow>
              <MultiSelect
                label="Categories"
                items={CATEGORIES}
                itemToString={c => c}
                selectedItems={categories()}
                onChange={setCategories}
                placeholder="Add a category…"
              />
              <Select
                label="VEN category"
                options={VEN_OPTIONS}
                value={ven()}
                onValueChange={setVen}
              />
            </FormRow>
            <TextField
              label="ATC code"
              value={atc()}
              onInput={e => setAtc(e.currentTarget.value)}
              placeholder="Optional"
            />
            <TextField
              label="mSupply universal code"
              value={universalCode()}
              onInput={e => setUniversalCode(e.currentTarget.value)}
              placeholder="Search the universal catalogue"
              helperText="Links this item to the shared code used across implementations."
            />
          </FormSection>

          <FormSection
            title="Where it can be used"
            headingLevel="h3"
            heading="group"
          >
            {/* The commonest reason a newly created item "doesn't appear" —
                stated where the decision is made, not in release notes. */}
            <Alert severity="info">
              An item on no master list exists but is invisible to every store.
              Adding it here is what makes it orderable.
            </Alert>
            <MultiSelect
              label="Master lists"
              items={props.masterLists}
              itemToString={list => list}
              selectedItems={lists()}
              onChange={setLists}
              placeholder="Add a master list…"
              helperText={
                lists().length === 0
                  ? 'No lists yet — this item will not be visible to any store.'
                  : `Reaches ${props.reachOf(lists())} of ${props.facilityCount} facilities`
              }
            />
            {/* Checkbox carries no helper slot, so the consequence of
                unchecking rides the label itself. */}
            <Checkbox
              label="Active — inactive items stay in history and reports but cannot be ordered or dispensed"
              checked={active()}
              onChange={setActive}
            />
          </FormSection>
        </FormColumn>
      </FormColumns>
    </Dialog>
  );
};
