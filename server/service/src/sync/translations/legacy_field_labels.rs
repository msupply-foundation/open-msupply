use anyhow::{bail, ensure};
use base64::{prelude::BASE64_STANDARD, Engine};
use log::warn;
use repository::{
    CustomFieldRow, CustomFieldRowRepository, RepositoryError, StorageConnection, SyncBufferRow,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::convert::TryInto;

use crate::sync::central_mapping_custom_fields::keys;
use crate::sync::CentralServerConfig;

use super::{PullTranslateResult, SyncTranslation};

/// mSupply's configurable labels for the legacy mapping fields, synced onto the
/// matching `custom_field.name` — a **central-only** path. When an admin renames
/// e.g. item "user field 1" in the mSupply preferences window, OG queues the
/// label pref record to syncing sites; central applies it to the seeded mapping
/// custom_field (see `central_mapping_custom_fields`, which deliberately leaves `name`
/// alone once a row exists) and the rename fans out to v7 remotes through the
/// regular `custom_field` sync path.
///
/// Two sources, one translator (dispatching on table):
///  * item `user_field_1..7` labels — a `pref` record (`item = "user_fields"`)
///    whose nested `data.data` object holds the labels as plain JSON strings.
///  * name `Custom 1..3` / `Category 1..6` labels — a `pref_blob` record
///    (`item = "name_cat_custom_values"`), a 9-element 4D text array serialized
///    by `VARIABLE TO BLOB` and base64-encoded on the wire (parsed below).
///
/// Both tables have other consumers (`StorePreferenceTranslation` on `pref`;
/// `pref_blob` items OMS doesn't read), so result semantics matter: a pref
/// item that isn't ours is `NotMatched` (someone else's record), while our
/// item in an unusable state (non-central, malformed data, no changes) is
/// `Ignored`. Labels are cosmetic — malformed data is never a translation
/// error that would mark the sync record as failed.

/// `pref_blob` "name_cat_custom_values" element order, as authored by OG's
/// `startup_create_prefs_records` (1-based 4D indices 1..9): categories 1–3,
/// customs 1–3, categories 4–6. The ids are the shared `central_mapping_custom_fields`
/// key constants, so only the element *order* is maintained by hand here.
const NAME_LABEL_PROPERTY_IDS: [&str; 9] = [
    keys::NAME_CATEGORY_1,
    keys::NAME_CATEGORY_2,
    keys::NAME_CATEGORY_3,
    keys::NAME_CUSTOM_1,
    keys::NAME_CUSTOM_2,
    keys::NAME_CUSTOM_3,
    keys::NAME_CATEGORY_4,
    keys::NAME_CATEGORY_5,
    keys::NAME_CATEGORY_6,
];

/// Item `user_field_1..7` keys, in 4D field-number order. The custom_field id is the
/// wire field name 1:1, so each const is both the JSON lookup key and the
/// `custom_field` id. Ids are the shared `central_mapping_custom_fields` constants.
const ITEM_USER_FIELD_IDS: [&str; 7] = [
    keys::ITEM_USER_FIELD_1,
    keys::ITEM_USER_FIELD_2,
    keys::ITEM_USER_FIELD_3,
    keys::ITEM_USER_FIELD_4,
    keys::ITEM_USER_FIELD_5,
    keys::ITEM_USER_FIELD_6,
    keys::ITEM_USER_FIELD_7,
];

/// Load the mapping custom_field and return it with the new display name, or None
/// when there's nothing to do: blank label, definition not present (seeding
/// runs before integration, so this only means an unknown id), or unchanged
/// name (no changelog churn on a re-sent pref).
fn updated_custom_field_name(
    connection: &StorageConnection,
    custom_field_id: &str,
    label: &str,
) -> Result<Option<CustomFieldRow>, RepositoryError> {
    let label = label.trim();
    if label.is_empty() {
        return Ok(None);
    }
    let Some(custom_field) = CustomFieldRowRepository::new(connection).find_one_by_id(custom_field_id)?
    else {
        return Ok(None);
    };
    if custom_field.name == label {
        return Ok(None);
    }
    Ok(Some(CustomFieldRow {
        name: label.to_string(),
        ..custom_field
    }))
}

/// First-stage deserialization: just enough to decide whether this `pref`
/// record is the one we care about. `data` shapes vary wildly by item (object,
/// string, ...), so the full parse only happens after the item matches.
#[derive(Deserialize)]
struct LegacyPrefItem {
    #[serde(default)]
    item: String,
}

/// The `pref` record's `data` *field* holds a copy of the whole pref record;
/// the labels live one level down at `data.data` (4D's `pref_set_value(...;
/// "data"; ...)` stores under that key).
#[derive(Deserialize)]
struct LegacyUserFieldsPref {
    data: LegacyUserFieldsPrefData,
}

#[derive(Deserialize)]
struct LegacyUserFieldsPrefData {
    #[serde(default)]
    data: HashMap<String, serde_json::Value>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(LegacyFieldLabelsTranslation)
}

pub(super) struct LegacyFieldLabelsTranslation;
impl SyncTranslation for LegacyFieldLabelsTranslation {
    fn table_names(&self) -> Vec<&str> {
        vec!["pref", "pref_blob"]
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        match sync_record.table_name.as_str() {
            "pref" => translate_user_field_labels(connection, sync_record),
            "pref_blob" => translate_name_field_labels(connection, sync_record),
            _ => Ok(PullTranslateResult::NotMatched),
        }
    }
}

/// Item `user_field_1..7` labels, from the `pref` "user_fields" record.
fn translate_user_field_labels(
    connection: &StorageConnection,
    sync_record: &SyncBufferRow,
) -> Result<PullTranslateResult, anyhow::Error> {
    // Other pref items belong to other translators (store preferences) or
    // to nobody — not ours, so NotMatched rather than Ignored.
    if sync_record.deserialize::<LegacyPrefItem>()?.item != "user_fields" {
        return Ok(PullTranslateResult::NotMatched);
    }

    // Central-only: remotes receive the renamed custom_field over v7 and
    // must not author it locally.
    if !CentralServerConfig::is_central_server() {
        return Ok(PullTranslateResult::Ignored(
            "Mapping custom_field labels are central-authored".to_string(),
        ));
    }

    // Malformed data is ignored (with diagnostics), not a translation
    // error — a single odd legacy record must not become a permanently
    // erroring sync buffer row.
    let labels = match sync_record.deserialize::<LegacyUserFieldsPref>() {
        Ok(pref) => pref.data.data,
        Err(error) => {
            warn!("Could not parse user_fields pref: {error}");
            return Ok(PullTranslateResult::Ignored(
                "Unparseable user_fields pref".to_string(),
            ));
        }
    };

    let mut upserts = Vec::new();
    for &key in &ITEM_USER_FIELD_IDS {
        let Some(label) = labels.get(key).and_then(|value| value.as_str()) else {
            continue;
        };
        // OG's factory default label is the raw key itself — keep the
        // friendlier seeded name ("User field N") until it's customised.
        // (Deliberate asymmetry: a label later reverted to this literal
        // default keeps whatever name OMS already has.)
        if label == key {
            continue;
        }
        if let Some(custom_field) = updated_custom_field_name(connection, key, label)? {
            upserts.push(custom_field);
        }
    }

    if upserts.is_empty() {
        return Ok(PullTranslateResult::Ignored(
            "No mapping custom_field label changes".to_string(),
        ));
    }
    Ok(PullTranslateResult::upserts(upserts))
}

/// Parse 4D's `VARIABLE TO BLOB` serialization of a TEXT ARRAY (the only shape
/// the label prefs use — `pref_blob.type = "as"`).
///
/// The format is not officially documented byte-by-byte, so this combines 4D's
/// public KB (asset 76426, "the variable type is stored in the 5th byte of the
/// BLOB"; signature "should be always RVLB with Intel CPUs (BLVR for old PPC
/// Macs)"; classic type codes 14–22 are arrays with 18 = text array; Unicode
/// builds remap codes, e.g. 33 = Unicode text) with live payloads captured from
/// an OG → OMS sync buffer:
///   bytes 0–3   magic `RVLB` (little-endian writer; `BLVR` would mean a
///               big-endian PPC writer — rejected, mSupply hasn't run on PPC
///               since long before OMS existed)
///   byte  4     variable type tag — 0x22 (34), the Unicode text array
///               (classic 18 + Unicode remap); the classic non-Unicode tag 18
///               is rejected with a distinct error
///   bytes 5–8   u32 LE array size (4D's `Size of array`, excluding element 0)
///   bytes 9–12  u32 LE current (selected) element index — varies with the
///               state the array was saved in (0, 5 and 7 in live payloads),
///               irrelevant to the labels
///   then        size + 1 strings, element 0 first (4D arrays carry a 0th
///               element; live payloads show the prefs UI leaves scratch text
///               in it, so it's dropped, not assumed empty), each a u32 LE
///               UTF-16 code-unit count followed by UTF-16LE data
///
/// Every structural assumption is validated — including that the strings
/// consume the blob *exactly* — so a future 4D encoding change degrades to a
/// parse error (the caller ignores the record) instead of garbage labels.
fn parse_4d_text_array(blob_b64: &str) -> Result<Vec<String>, anyhow::Error> {
    const HEADER_LEN: usize = 13;
    const UNICODE_TEXT_ARRAY_TAG: u8 = 34;
    const CLASSIC_TEXT_ARRAY_TAG: u8 = 18;
    // The label arrays are small (9 elements, short strings); anything huge is
    // a misparse, not data — bound it before allocating.
    const MAX_ELEMENTS: usize = 10_000;
    const MAX_STRING_UNITS: usize = 100_000;

    let bytes = BASE64_STANDARD.decode(blob_b64)?;
    ensure!(bytes.len() >= HEADER_LEN, "blob shorter than header");
    match &bytes[0..4] {
        b"RVLB" => {}
        b"BLVR" => bail!("big-endian (PPC-written) blob is not supported"),
        other => bail!("bad magic {other:02x?}"),
    }
    match bytes[4] {
        UNICODE_TEXT_ARRAY_TAG => {}
        CLASSIC_TEXT_ARRAY_TAG => bail!("non-Unicode text array is not supported"),
        other => bail!("not a Unicode text array (type tag {other})"),
    }
    let size = u32::from_le_bytes(bytes[5..9].try_into()?) as usize;
    ensure!(size <= MAX_ELEMENTS, "implausible array size {size}");
    // Bytes 9–12 (current element index) carry no label data; the exact-length
    // check below is what guards against a layout this parser doesn't know.

    let mut offset = HEADER_LEN;
    // Element 0 included — stripped below.
    let mut result = Vec::with_capacity(size + 1);
    for _ in 0..=size {
        let Some(length_bytes) = bytes.get(offset..offset + 4) else {
            bail!("truncated element length at offset {offset}");
        };
        let units = u32::from_le_bytes(length_bytes.try_into()?) as usize;
        ensure!(
            units <= MAX_STRING_UNITS,
            "implausible string length {units}"
        );
        offset += 4;
        let Some(data) = bytes.get(offset..offset + units * 2) else {
            bail!("truncated element data at offset {offset}");
        };
        let utf16: Vec<u16> = data
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect();
        result.push(String::from_utf16(&utf16)?);
        offset += units * 2;
    }
    // A correct parse consumes the blob exactly; leftovers mean the layout
    // isn't what this parser thinks it is.
    ensure!(
        offset == bytes.len(),
        "{} trailing bytes after the last element",
        bytes.len() - offset
    );

    result.remove(0);
    Ok(result)
}

#[derive(Deserialize)]
struct LegacyPrefBlobRow {
    #[serde(default)]
    item: String,
    #[serde(default, rename = "type")]
    r#type: String,
    #[serde(default)]
    blob: String,
}

/// Name `Custom 1..3` / `Category 1..6` labels, from the `pref_blob`
/// "name_cat_custom_values" record.
fn translate_name_field_labels(
    connection: &StorageConnection,
    sync_record: &SyncBufferRow,
) -> Result<PullTranslateResult, anyhow::Error> {
    let data = sync_record.deserialize::<LegacyPrefBlobRow>()?;
    // Other pref_blob items aren't ours — NotMatched (same outcome as
    // before this translator existed: no translator found).
    if data.item != "name_cat_custom_values" {
        return Ok(PullTranslateResult::NotMatched);
    }

    // Central-only, mirroring the user-fields path.
    if !CentralServerConfig::is_central_server() {
        return Ok(PullTranslateResult::Ignored(
            "Mapping custom_field labels are central-authored".to_string(),
        ));
    }

    if data.r#type != "as" {
        warn!(
            "name_cat_custom_values has unexpected type {:?} — ignoring",
            data.r#type
        );
        return Ok(PullTranslateResult::Ignored(
            "Unexpected pref_blob type".to_string(),
        ));
    }
    let labels = match parse_4d_text_array(&data.blob) {
        Ok(labels) if labels.len() >= NAME_LABEL_PROPERTY_IDS.len() => labels,
        Ok(labels) => {
            warn!(
                "name_cat_custom_values has {} labels, expected {} — ignoring",
                labels.len(),
                NAME_LABEL_PROPERTY_IDS.len()
            );
            return Ok(PullTranslateResult::Ignored(
                "Unexpected label count".to_string(),
            ));
        }
        Err(error) => {
            warn!("Could not parse name_cat_custom_values blob: {error}");
            return Ok(PullTranslateResult::Ignored(
                "Unparseable label blob".to_string(),
            ));
        }
    };

    let mut upserts = Vec::new();
    for (custom_field_id, label) in NAME_LABEL_PROPERTY_IDS.iter().zip(&labels) {
        if let Some(custom_field) = updated_custom_field_name(connection, custom_field_id, label)? {
            upserts.push(custom_field);
        }
    }

    if upserts.is_empty() {
        return Ok(PullTranslateResult::Ignored(
            "No mapping custom_field label changes".to_string(),
        ));
    }
    Ok(PullTranslateResult::upserts(upserts))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::{
        central_mapping_custom_fields::seed_central_mapping_custom_fields,
        test_util_set_is_central_server,
    };
    use repository::{mock::MockDataInserts, test_db::setup_all, SyncAction, SyncRecordData};

    /// Captured from a live OG → OMS sync buffer: the 9 factory-default name
    /// labels ("Category 1".."3", "Custom 1".."3", "Category 4".."6"), with a
    /// zero current-element word and an empty element 0.
    const DEFAULT_NAME_LABELS_BLOB: &str = "UlZMQiIJAAAAAAAAAAAAAAAKAAAAQwBhAHQAZQBnAG8AcgB5ACAAMQAKAAAAQwBhAHQAZQBnAG8AcgB5ACAAMgAKAAAAQwBhAHQAZQBnAG8AcgB5ACAAMwAIAAAAQwB1AHMAdABvAG0AIAAxAAgAAABDAHUAcwB0AG8AbQAgADIACAAAAEMAdQBzAHQAbwBtACAAMwAKAAAAQwBhAHQAZQBnAG8AcgB5ACAANAAKAAAAQwBhAHQAZQBnAG8AcgB5ACAANQAKAAAAQwBhAHQAZQBnAG8AcgB5ACAANgA=";

    /// Also captured live, after renaming the "Custom 1" label to "OWIEGh" in
    /// the OG preferences window. Exercises the parts a hand-rolled fixture
    /// wouldn't: a non-zero current-element word (5) and scratch text in
    /// element 0 ("Custom 1").
    const CUSTOMISED_NAME_LABELS_BLOB: &str = "UlZMQiIJAAAABQAAAAgAAABDAHUAcwB0AG8AbQAgADEACgAAAEMAYQB0AGUAZwBvAHIAeQAgADEACgAAAEMAYQB0AGUAZwBvAHIAeQAgADIACgAAAEMAYQB0AGUAZwBvAHIAeQAgADMABgAAAE8AVwBJAEUARwBoAAgAAABDAHUAcwB0AG8AbQAgADIACAAAAEMAdQBzAHQAbwBtACAAMwAKAAAAQwBhAHQAZQBnAG8AcgB5ACAANAAKAAAAQwBhAHQAZQBnAG8AcgB5ACAANQAKAAAAQwBhAHQAZQBnAG8AcgB5ACAANgA=";

    #[test]
    fn parses_4d_text_array_blob() {
        let labels = parse_4d_text_array(DEFAULT_NAME_LABELS_BLOB).unwrap();
        assert_eq!(
            labels,
            vec![
                "Category 1",
                "Category 2",
                "Category 3",
                "Custom 1",
                "Custom 2",
                "Custom 3",
                "Category 4",
                "Category 5",
                "Category 6"
            ]
        );

        assert!(parse_4d_text_array("not base64!").is_err());
        // Valid base64, wrong magic.
        assert!(parse_4d_text_array(
            &BASE64_STANDARD.encode(b"XXXX\x22\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00")
        )
        .is_err());
        // Truncated: header promises an element that isn't there.
        let valid = BASE64_STANDARD.decode(DEFAULT_NAME_LABELS_BLOB).unwrap();
        assert!(parse_4d_text_array(&BASE64_STANDARD.encode(&valid[..40])).is_err());

        // Unsupported variants are rejected with a parse error (→ the record
        // is ignored) rather than misread: a PPC-written (big-endian) blob, the
        // classic non-Unicode text array tag, and trailing bytes after the
        // last element (layout drift in a future 4D).
        let variant = |mutate: &dyn Fn(&mut Vec<u8>)| {
            let mut bytes = valid.clone();
            mutate(&mut bytes);
            parse_4d_text_array(&BASE64_STANDARD.encode(&bytes))
        };
        assert!(variant(&|b| b[0..4].copy_from_slice(b"BLVR")).is_err());
        assert!(variant(&|b| b[4] = 18).is_err());
        assert!(variant(&|b| b.push(0)).is_err());

        // A real post-rename payload: non-zero current-element word, scratch
        // text in element 0 (dropped), "Custom 1" renamed to "OWIEGh" at {4}.
        assert_eq!(
            parse_4d_text_array(CUSTOMISED_NAME_LABELS_BLOB).unwrap(),
            vec![
                "Category 1",
                "Category 2",
                "Category 3",
                "OWIEGh",
                "Custom 2",
                "Custom 3",
                "Category 4",
                "Category 5",
                "Category 6"
            ]
        );

        // A non-empty 0th element (4D scratch) is dropped — also via the
        // round-trip helper.
        let labels: Vec<String> = ["zero", "one", "two"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        let blob = encode_4d_text_array(&labels[1..], Some("zero"));
        assert_eq!(parse_4d_text_array(&blob).unwrap(), vec!["one", "two"]);
    }

    fn user_fields_pref(labels: serde_json::Value) -> SyncBufferRow {
        SyncBufferRow {
            table_name: "pref".to_string(),
            record_id: "PREF_USER_FIELDS".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "PREF_USER_FIELDS",
                "item": "user_fields",
                "store_ID": "",
                "data": {
                    "ID": "PREF_USER_FIELDS",
                    "item": "user_fields",
                    "data": labels,
                },
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn user_field_labels_update_custom_field_names_on_central() {
        let translator = LegacyFieldLabelsTranslation {};

        let (_, connection, _, _) = setup_all(
            "user_field_labels_update_custom_field_names_on_central",
            MockDataInserts::none(),
        )
        .await;
        seed_central_mapping_custom_fields(&connection).unwrap();
        test_util_set_is_central_server(true);

        // A customised label renames the custom_field; an untouched factory
        // default ("user_field_2") keeps the friendlier seeded name.
        let record = user_fields_pref(serde_json::json!({
            "user_field_1": "ABC classification",
            "user_field_2": "user_field_2",
            "user_field_3": "",
        }));
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &record)
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("ABC classification"), "{debug}");
        assert!(
            !debug.contains("user_field_2"),
            "default label must not override the seeded name: {debug}"
        );
        assert!(
            !debug.contains("user_field_3"),
            "blank label must be skipped: {debug}"
        );

        // Apply the rename (as integration would), then re-translate the same
        // pref: no change, no churn.
        let repo = CustomFieldRowRepository::new(&connection);
        let mut custom_field = repo
            .find_one_by_id("user_field_1")
            .unwrap()
            .unwrap();
        custom_field.name = "ABC classification".to_string();
        repo.upsert_one(&custom_field).unwrap();
        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &user_fields_pref(serde_json::json!({ "user_field_1": "ABC classification" })),
            )
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));

        // Other pref items aren't ours: NotMatched, so the integration engine
        // still applies whatever another translator (store preferences)
        // produced for the record.
        let other = SyncBufferRow {
            table_name: "pref".to_string(),
            record_id: "STORE_A".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "STORE_A",
                "item": "store_preferences",
                "data": { "default_item_packsize_to_one": true },
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &other)
            .unwrap();
        assert!(matches!(result, PullTranslateResult::NotMatched));

        // A malformed user_fields pref (data not the expected shape) is
        // ignored with diagnostics, never a translation error.
        let malformed = SyncBufferRow {
            table_name: "pref".to_string(),
            record_id: "PREF_USER_FIELDS".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "PREF_USER_FIELDS",
                "item": "user_fields",
                "data": "not an object",
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &malformed)
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));

        // On a remote, nothing is authored (the rename arrives via v7).
        test_util_set_is_central_server(false);
        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &user_fields_pref(serde_json::json!({ "user_field_1": "ABC classification" })),
            )
            .unwrap();
        assert!(
            matches!(result, PullTranslateResult::Ignored(_)),
            "remote must not author mapping custom_field renames: {result:?}"
        );
    }

    #[actix_rt::test]
    async fn name_field_labels_update_custom_field_names_on_central() {
        let translator = LegacyFieldLabelsTranslation {};

        let (_, connection, _, _) = setup_all(
            "name_field_labels_update_custom_field_names_on_central",
            MockDataInserts::none(),
        )
        .await;
        seed_central_mapping_custom_fields(&connection).unwrap();
        test_util_set_is_central_server(true);

        let record = |blob: &str| SyncBufferRow {
            table_name: "pref_blob".to_string(),
            record_id: "PREF_NAME_LABELS".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "PREF_NAME_LABELS",
                "item": "name_cat_custom_values",
                "type": "as",
                "blob": blob,
                "store_id": "",
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        // The factory defaults match the seeded names exactly — nothing to do.
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &record(DEFAULT_NAME_LABELS_BLOB))
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));

        // Customise element 4 ("Custom 1" → "Donor code") and element 7
        // ("Category 4" → "Region"): the matching custom_fields are renamed.
        let mut labels = parse_4d_text_array(DEFAULT_NAME_LABELS_BLOB).unwrap();
        labels[3] = "Donor code".to_string();
        labels[6] = "Region".to_string();
        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &record(&encode_4d_text_array(&labels, None)),
            )
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("custom_1"), "{debug}");
        assert!(debug.contains("Donor code"), "{debug}");
        assert!(debug.contains("name_category_4"), "{debug}");
        assert!(debug.contains("Region"), "{debug}");
        assert!(!debug.contains("name_category_2"), "{debug}");

        // The live captured post-rename payload (non-zero current-element
        // word, scratch element 0) renames Custom 1.
        let result = translator
            .try_translate_from_upsert_sync_record(
                &connection,
                &record(CUSTOMISED_NAME_LABELS_BLOB),
            )
            .unwrap();
        let debug = format!("{result:?}");
        assert!(debug.contains("custom_1"), "{debug}");
        assert!(debug.contains("OWIEGh"), "{debug}");

        // A malformed blob is ignored, never an error.
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &record("garbage"))
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));

        // On a remote, nothing is authored.
        test_util_set_is_central_server(false);
        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &record(DEFAULT_NAME_LABELS_BLOB))
            .unwrap();
        assert!(matches!(result, PullTranslateResult::Ignored(_)));
    }

    /// `pref` now has two pull translators (store preferences + user-field
    /// labels); run real records through the full integration engine to prove
    /// neither poisons the other — one translator's Ignored/NotMatched must
    /// not drop the other's operations (the engine only treats a record as
    /// ignored when *no* translator produced operations).
    #[actix_rt::test]
    async fn pref_pipeline_integrates_both_translators() {
        use crate::sync::translation_and_integration::TranslationAndIntegration;
        use crate::sync::translations::all_translators;
        use repository::StorePreferenceRowRepository;

        let (_, connection, _, _) = setup_all(
            "pref_pipeline_integrates_both_translators",
            MockDataInserts::none(),
        )
        .await;
        seed_central_mapping_custom_fields(&connection).unwrap();
        test_util_set_is_central_server(true);

        // A store_preferences pref (StorePreferenceTranslation's record — the
        // labels translator returns NotMatched for it) and a customised
        // user_fields pref (the labels translator's record — store preferences
        // returns Ignored("Unsupported pref type") for it).
        let store_pref = SyncBufferRow {
            table_name: "pref".to_string(),
            record_id: "STORE_A".to_string(),
            data: SyncRecordData(serde_json::json!({
                "ID": "STORE_A",
                "store_ID": "STORE_A",
                "item": "store_preferences",
                "data": { "default_item_packsize_to_one": true },
            })),
            action: SyncAction::Upsert,
            ..Default::default()
        };
        let user_fields =
            user_fields_pref(serde_json::json!({ "user_field_1": "ABC classification" }));

        let errors = TranslationAndIntegration::new(&connection)
            .translate_and_integrate_sync_records(&[store_pref, user_fields], &all_translators())
            .unwrap();
        assert_eq!(errors, 0);

        // Both records' operations applied: the store preference row exists...
        let store_preference = StorePreferenceRowRepository::new(&connection)
            .find_one_by_id_or_default("STORE_A")
            .unwrap();
        assert!(
            store_preference.pack_to_one,
            "store_preferences upsert must not be dropped by the labels translator"
        );
        // ...and the mapping custom_field is renamed.
        assert_eq!(
            CustomFieldRowRepository::new(&connection)
                .find_one_by_id("user_field_1")
                .unwrap()
                .unwrap()
                .name,
            "ABC classification",
            "label rename must not be dropped by the store preferences translator"
        );
    }

    /// Re-encode labels in the 4D text-array format (test helper — the inverse
    /// of `parse_4d_text_array`). `element_zero` fills the 4D array's unused
    /// 0th element (None → empty, as in real payloads).
    fn encode_4d_text_array(labels: &[String], element_zero: Option<&str>) -> String {
        let mut bytes = b"RVLB\x22".to_vec();
        bytes.extend((labels.len() as u32).to_le_bytes());
        bytes.extend(0u32.to_le_bytes());
        for label in std::iter::once(element_zero.unwrap_or(""))
            .chain(labels.iter().map(|label| label.as_str()))
        {
            let utf16: Vec<u16> = label.encode_utf16().collect();
            bytes.extend((utf16.len() as u32).to_le_bytes());
            for unit in utf16 {
                bytes.extend(unit.to_le_bytes());
            }
        }
        BASE64_STANDARD.encode(bytes)
    }
}
