//! Converts React front end (`client/`) table layouts into the Solid front end's
//! (`frontend/`) shape, through `legacy_table_config_map.json`.
//!
//! The Solid front end's one-time import of personal layouts
//! (`frontend/src/legacyTableImport/`) applies the same rules, and both run
//! `conversion_fixtures.json`, so a change here needs the same change there.
//! This file is part of a shipped migration fragment once released: a site
//! that has run the fragment won't run it again, so fix a rule with a new
//! fragment rather than by editing this one.
//!
//! An old layout is a material-react-table `ManagedTableState`:
//! `{ columnOrder, columnSizing, columnPinning, columnVisibility, density,
//! viewMode, grouping }`, each present only if the user changed it. A new
//! layout is a `TableConfig`: the same four column settings, `viewDensity`,
//! `viewMode` and `groupRows`.

use serde::Deserialize;
use serde_json::{Map, Value};
use std::collections::{BTreeMap, HashSet};

/// `legacy_table_config_map.json`. The Solid front end checks the full shape
/// whenever it loads the file (`frontend/vite/legacyTableConfigMap.ts`).
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub(crate) struct LegacyTableConfigMap {
    #[allow(dead_code)]
    pub(crate) version: u32,
    /// Old column id prefix → new prefix, for runtime column ids (custom
    /// fields). Applies to a column the entry's `columns` doesn't list.
    #[serde(default, rename = "columnPrefixes")]
    pub(crate) column_prefixes: BTreeMap<String, String>,
    /// In a fixed order: when two entries map to the same `to`, the earlier
    /// one wins.
    pub(crate) tables: Vec<LegacyTableMapping>,
}

#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub(crate) struct LegacyTableMapping {
    pub(crate) from: String,
    pub(crate) to: String,
    /// Old column id → new column id, or `None` to drop the column.
    pub(crate) columns: BTreeMap<String, Option<String>>,
    /// What a non-empty old `grouping` means for the new table.
    #[serde(default, rename = "groupRows")]
    pub(crate) group_rows: Option<bool>,
}

pub(crate) fn parse_map(json: &str) -> serde_json::Result<LegacyTableConfigMap> {
    serde_json::from_str(json)
}

/// The new column id for `old`, or `None` if the column is dropped: the
/// entry's own `columns` first, then the longest matching `columnPrefixes`
/// key.
fn new_column_id(
    old: &str,
    entry: &LegacyTableMapping,
    prefixes: &BTreeMap<String, String>,
) -> Option<String> {
    if let Some(target) = entry.columns.get(old) {
        return target.clone();
    }
    prefixes
        .iter()
        .filter(|(prefix, _)| old.starts_with(prefix.as_str()))
        .max_by_key(|(prefix, _)| prefix.len())
        .map(|(prefix, target)| format!("{target}{}", &old[prefix.len()..]))
}

/// A list of column ids, mapped. Several old columns can map to one new
/// column (a column whose old id is its translated header has one key per
/// translation), so the first occurrence wins.
fn map_column_list(
    value: Option<&Value>,
    entry: &LegacyTableMapping,
    prefixes: &BTreeMap<String, String>,
) -> Vec<Value> {
    let Some(Value::Array(ids)) = value else {
        return Vec::new();
    };
    let mut seen = HashSet::new();
    ids.iter()
        .filter_map(Value::as_str)
        .filter_map(|old| new_column_id(old, entry, prefixes))
        .filter(|new| seen.insert(new.clone()))
        .map(Value::String)
        .collect()
}

/// A column id → value object, mapped, keeping the values `keep` returns.
/// When several old columns map to one new column, the old id that sorts
/// first (by code point) wins, so the result doesn't depend on the order the
/// object was stored in.
fn map_column_object(
    value: Option<&Value>,
    entry: &LegacyTableMapping,
    prefixes: &BTreeMap<String, String>,
    keep: impl Fn(&Value) -> Option<Value>,
) -> Map<String, Value> {
    let Some(Value::Object(old)) = value else {
        return Map::new();
    };
    let mut old_ids: Vec<&String> = old.keys().collect();
    old_ids.sort();
    let mut result = Map::new();
    for old_id in old_ids {
        let Some(new_id) = new_column_id(old_id, entry, prefixes) else {
            continue;
        };
        if result.contains_key(&new_id) {
            continue;
        }
        if let Some(kept) = keep(&old[old_id]) {
            result.insert(new_id, kept);
        }
    }
    result
}

/// px → rem at the base root font size (16px), rounded to 2 decimal places,
/// as the Solid front end's `pxToRem` does. A whole number is written as an
/// integer, so the stored JSON is the same as JavaScript would write.
fn px_to_rem(px: &Value) -> Option<Value> {
    let px = px.as_f64().filter(|px| px.is_finite() && *px > 0.0)?;
    let rem = ((px / 16.0) * 100.0).round() / 100.0;
    if rem.fract() == 0.0 {
        Some(Value::from(rem as i64))
    } else {
        Some(Value::from(rem))
    }
}

fn one_of(value: Option<&Value>, allowed: &[&str]) -> Option<Value> {
    value
        .and_then(Value::as_str)
        .filter(|value| allowed.contains(value))
        .map(|value| Value::String(value.to_string()))
}

/// One old table's layout as a new `TableConfig`, or `None` if nothing in it
/// carries over (it isn't an object, or every setting is empty once its
/// columns are mapped).
pub(crate) fn convert_table(
    old: &Value,
    entry: &LegacyTableMapping,
    prefixes: &BTreeMap<String, String>,
) -> Option<Map<String, Value>> {
    let Value::Object(old) = old else {
        return None;
    };
    let mut config = Map::new();

    let order = map_column_list(old.get("columnOrder"), entry, prefixes);
    if !order.is_empty() {
        config.insert("columnOrder".to_string(), Value::Array(order));
    }

    let sizing = map_column_object(old.get("columnSizing"), entry, prefixes, px_to_rem);
    if !sizing.is_empty() {
        config.insert("columnSizing".to_string(), Value::Object(sizing));
    }

    let mut pinning = Map::new();
    let old_pinning = old.get("columnPinning");
    for side in ["left", "right"] {
        let ids = map_column_list(old_pinning.and_then(|p| p.get(side)), entry, prefixes);
        if !ids.is_empty() {
            pinning.insert(side.to_string(), Value::Array(ids));
        }
    }
    if !pinning.is_empty() {
        config.insert("columnPinning".to_string(), Value::Object(pinning));
    }

    let visibility = map_column_object(old.get("columnVisibility"), entry, prefixes, |shown| {
        shown.as_bool().map(Value::Bool)
    });
    if !visibility.is_empty() {
        config.insert("columnVisibility".to_string(), Value::Object(visibility));
    }

    if let Some(density) = one_of(old.get("density"), &["compact", "comfortable", "spacious"]) {
        config.insert("viewDensity".to_string(), density);
    }
    if let Some(view_mode) = one_of(old.get("viewMode"), &["table", "card"]) {
        config.insert("viewMode".to_string(), view_mode);
    }

    // The Solid front end only ever stores `true`: grouping off is its default.
    let grouped = matches!(old.get("grouping"), Some(Value::Array(fields)) if !fields.is_empty());
    if grouped && entry.group_rows == Some(true) {
        config.insert("groupRows".to_string(), Value::Bool(true));
    }

    (!config.is_empty()).then_some(config)
}

/// Old layouts by old table id → new `TableConfig`s by new table id. Entries
/// are applied in map order and the first to produce a layout for a new
/// table wins; an old table the map doesn't list is skipped.
pub(crate) fn convert_tables(
    old: &Map<String, Value>,
    map: &LegacyTableConfigMap,
) -> Map<String, Value> {
    let mut result = Map::new();
    for entry in &map.tables {
        if result.contains_key(&entry.to) {
            continue;
        }
        let Some(old_layout) = old.get(&entry.from) else {
            continue;
        };
        if let Some(config) = convert_table(old_layout, entry, &map.column_prefixes) {
            result.insert(entry.to.clone(), Value::Object(config));
        }
    }
    result
}

/// A shared-defaults entry already in the new shape: saved from the Solid
/// front end under a table id both front ends use.
fn is_new_shape(layout: &Value) -> bool {
    layout
        .as_object()
        .is_some_and(|layout| layout.contains_key("base") || layout.contains_key("compact"))
}

/// The whole `global_table_configs` object → the
/// `global_table_default_configs` object. An entry already in the new shape
/// is copied as it is (its key is already a new table id) and beats a
/// converted one for the same table. The others are converted, under `base`
/// only, so phone-width screens keep their built-in defaults.
pub(crate) fn convert_global_table_configs(
    old: &Map<String, Value>,
    map: &LegacyTableConfigMap,
) -> Map<String, Value> {
    let mut result: Map<String, Value> = old
        .iter()
        .filter(|(_, layout)| is_new_shape(layout))
        .map(|(table_id, layout)| (table_id.clone(), layout.clone()))
        .collect();
    let old_shape: Map<String, Value> = old
        .iter()
        .filter(|(_, layout)| !is_new_shape(layout))
        .map(|(table_id, layout)| (table_id.clone(), layout.clone()))
        .collect();
    for (table_id, config) in convert_tables(&old_shape, map) {
        result
            .entry(table_id)
            .or_insert_with(|| serde_json::json!({ "base": config }));
    }
    result
}
