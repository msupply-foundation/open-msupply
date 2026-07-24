// The custom-field LIST FILTER logic (spec/ui-standards/custom-fields › lists).
// Pure and node-testable. Custom-field filter values are a UI vocabulary, typed
// per value-kind, that this module expands to the server's `dynamicFilter` AST
// — the same "UI filter maps onto the wire" shape as the items stock lens
// (kdd/page-composition). The AST operators are a server wire contract
// (backend `json_custom_field_filter.rs`), not a UI choice.

// One field's filter value, tagged by kind. A range (number/date) carries an
// inclusive lower and/or upper bound; option carries the chosen option ids
// (already expanded to include descendants — parse.optionAndDescendantIds).
export type CustomFieldFilterValue =
  | { kind: 'text'; contains: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'option'; optionIds: string[] }
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'date'; from?: string; to?: string };

// The list's custom-field filter state (URL-backed): a value per key. `null`
// marks an added-but-empty chip (FilterBar's convention); it contributes no
// condition.
export type CustomFieldFilterState = Record<
  string,
  CustomFieldFilterValue | null
>;

// One value → its dynamicFilter condition node(s). A range expands to two nodes
// (>= min, <= max); a value carrying no bound contributes nothing.
const conditionsFor = (key: string, v: CustomFieldFilterValue): unknown[] => {
  const cf = (filter: unknown) => ({ CustomField: { key, filter } });
  switch (v.kind) {
    case 'text':
      return v.contains ? [cf({ Text: { Like: v.contains } })] : [];
    case 'boolean':
      return [cf({ Boolean: { Equal: v.value } })];
    case 'option':
      return v.optionIds.length ? [cf({ Option: { In: v.optionIds } })] : [];
    case 'number': {
      const out: unknown[] = [];
      if (v.min !== undefined)
        out.push(cf({ Number: { GreaterThanOrEqual: v.min } }));
      if (v.max !== undefined)
        out.push(cf({ Number: { LowerThanOrEqual: v.max } }));
      return out;
    }
    case 'date': {
      const out: unknown[] = [];
      if (v.from) out.push(cf({ Date: { GreaterThanOrEqual: v.from } }));
      if (v.to) out.push(cf({ Date: { LowerThanOrEqual: v.to } }));
      return out;
    }
  }
};

// All custom-field filter values → the `dynamicFilter` JSON (an `{ And: [...] }`
// of CustomField nodes), or undefined when nothing is set (a no-op). Every
// condition ANDs with the others and with the rest of the query's filter.
export const buildCustomFieldDynamicFilter = (
  state: CustomFieldFilterState | undefined
): unknown | undefined => {
  if (!state) return undefined;
  const conditions = Object.entries(state).flatMap(([key, v]) =>
    v ? conditionsFor(key, v) : []
  );
  return conditions.length ? { And: conditions } : undefined;
};
