use anyhow::Context;
use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, CurrencyRowRepository, GenderType, NameRow, NameRowDelete,
    NameRowRepository, NameRowType, Row, StorageConnection, SyncBufferRow,
};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, zero_date_as_option,
};

use serde::{Deserialize, Serialize};

use crate::sync::{
    central_mapping_properties::keys, translations::currency::CurrencyTranslation,
    CentralServerConfig,
};

use super::{
    utils::{clear_invalid_fk, merge_legacy_properties, LegacyPropertiesBuilder},
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

/// `properties_v2` keys the legacy OG→OMS name import owns (derived from
/// `[name]custom1/2/3` and `[name]category1_ID..category6_ID`). On a v5 re-import
/// these are refreshed from OG; every other key in the blob (e.g. OMS-authored
/// patient custom-field edits) is preserved. See [`merge_legacy_properties`].
///
/// The category keys are editable on patients (the first editable OPTIONs); like
/// `custom_1/2/3` they remain OG-owned, so a re-pull of a changed OG record
/// refreshes them — last-writer-wins, identical to the custom fields (push-back
/// to OG is inert behind the `PushToLegacyCentral` guard).
const LEGACY_NAME_OWNED_KEYS: &[&str] = &[
    keys::NAME_CUSTOM_1,
    keys::NAME_CUSTOM_2,
    keys::NAME_CUSTOM_3,
    // `property_v2.key` is globally unique, so the name category dimensions are
    // prefixed `name_category*` (item already owns `category2`/`category3`).
    keys::NAME_CATEGORY_1,
    keys::NAME_CATEGORY_2,
    keys::NAME_CATEGORY_3,
    keys::NAME_CATEGORY_4,
    keys::NAME_CATEGORY_5,
    keys::NAME_CATEGORY_6,
];

#[derive(Deserialize, Serialize, Debug, PartialEq)]
pub enum LegacyNameRowType {
    #[serde(rename = "facility")]
    Facility,
    #[serde(rename = "patient")]
    Patient,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "invad")]
    Invad,
    #[serde(rename = "repack")]
    Repack,
    #[serde(rename = "store")]
    Store,

    #[serde(other)]
    Others,
}

/// Build the `name.properties_v2` JSONB from legacy `[name]custom1/2/3` fields.
///
/// All three are TEXT properties, so they go through the shared
/// [`LegacyPropertiesBuilder`], which omits empty values and returns `None` when
/// every field is absent (untouched rows stay NULL rather than carrying `{}`).
///
/// Keys match the central mapping-property seeder (`central_mapping_properties`):
/// snake_case `custom_1`/`custom_2`/`custom_3` on the OMS side, decoupled from
/// the 4D column names (`custom1` etc.) via this mapping.
fn build_legacy_properties(legacy: &LegacyNameRow) -> Option<serde_json::Value> {
    LegacyPropertiesBuilder::new()
        .text(keys::NAME_CUSTOM_1, legacy.custom_1.as_deref())
        .text(keys::NAME_CUSTOM_2, legacy.custom_2.as_deref())
        .text(keys::NAME_CUSTOM_3, legacy.custom_3.as_deref())
        // Name categories 1–6 as OPTIONs (parallel to item categories). 4D gives
        // a name one leaf id per dimension; stored as the option id so the client
        // resolves it against the `property_option_v2` rows authored by the name
        // category import. See central_mapping_properties (`NAME_CATEGORY_*`).
        .option(keys::NAME_CATEGORY_1, legacy.category1_id.as_deref())
        .option(keys::NAME_CATEGORY_2, legacy.category2_id.as_deref())
        .option(keys::NAME_CATEGORY_3, legacy.category3_id.as_deref())
        .option(keys::NAME_CATEGORY_4, legacy.category4_id.as_deref())
        .option(keys::NAME_CATEGORY_5, legacy.category5_id.as_deref())
        .option(keys::NAME_CATEGORY_6, legacy.category6_id.as_deref())
        .build()
}

/// Inverse of [`build_legacy_properties`]: read a single legacy custom-field
/// value out of `properties_v2` for the v5 push back to OG. custom1/2/3 are TEXT,
/// so only string values are returned; an absent or non-string key yields `None`.
fn legacy_custom_field_from_properties(
    properties_v2: &Option<serde_json::Value>,
    key: &str,
) -> Option<String> {
    properties_v2
        .as_ref()?
        .as_object()?
        .get(key)?
        .as_str()
        .map(str::to_string)
}

impl LegacyNameRowType {
    fn to_name_type(&self) -> NameRowType {
        match self {
            LegacyNameRowType::Facility => NameRowType::Facility,
            LegacyNameRowType::Patient => NameRowType::Patient,
            LegacyNameRowType::Build => NameRowType::Build,
            LegacyNameRowType::Invad => NameRowType::Invad,
            LegacyNameRowType::Repack => NameRowType::Repack,
            LegacyNameRowType::Store => NameRowType::Store,
            LegacyNameRowType::Others => NameRowType::Others,
        }
    }
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameRow {
    #[serde(rename = "ID")]
    pub id: String,

    pub name: String,
    pub code: String,
    pub r#type: LegacyNameRowType,

    #[serde(rename = "customer")]
    pub is_customer: bool,

    #[serde(rename = "supplier")]
    pub is_supplier: bool,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub supplying_store_id: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "first")]
    pub first_name: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "last")]
    pub last_name: Option<String>,

    pub female: bool,

    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_of_birth: Option<NaiveDate>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub phone: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "charge code")]
    pub charge_code: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub country: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "bill_address1")]
    pub address1: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "bill_address2")]
    pub address2: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub email: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "url")]
    pub website: Option<String>,

    #[serde(rename = "manufacturer")]
    pub is_manufacturer: bool,

    #[serde(rename = "donor")]
    pub is_donor: bool,

    #[serde(rename = "hold")]
    pub on_hold: bool,

    #[serde(rename = "NEXT_OF_KIN_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub next_of_kin_id: Option<String>,

    #[serde(rename = "next_of_kin_relative")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub next_of_kin_name: Option<String>,

    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub created_date: Option<NaiveDate>,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub national_health_number: Option<String>,

    #[serde(rename = "isDeceased")]
    pub is_deceased: bool,

    #[serde(rename = "om_created_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_datetime: Option<NaiveDateTime>,

    #[serde(rename = "om_gender")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub gender: Option<GenderType>,

    #[serde(default)]
    #[serde(rename = "om_date_of_death")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date_of_death: Option<NaiveDate>,

    #[serde(default)]
    pub custom_data: Option<serde_json::Value>,

    // Legacy 4D `[name]custom1/2/3` columns. Field names use snake_case (Rust
    // convention) and serde rename pins the wire name to the 4D column name.
    // TODO: when we widen this beyond custom1/2/3, consider #[serde(flatten)]
    // into a HashMap and filter by property table at translate time.
    #[serde(default, rename = "custom1", deserialize_with = "empty_str_as_option_string")]
    pub custom_1: Option<String>,
    #[serde(default, rename = "custom2", deserialize_with = "empty_str_as_option_string")]
    pub custom_2: Option<String>,
    #[serde(default, rename = "custom3", deserialize_with = "empty_str_as_option_string")]
    pub custom_3: Option<String>,

    // Legacy 4D `[name]category1_ID..category6_ID` columns — six independent
    // category dimensions, each storing a leaf id. Imported as OPTION props
    // (`build_legacy_properties`); category1 is hierarchical, 2–6 flat.
    #[serde(default, rename = "category1_ID", deserialize_with = "empty_str_as_option_string")]
    pub category1_id: Option<String>,
    #[serde(default, rename = "category2_ID", deserialize_with = "empty_str_as_option_string")]
    pub category2_id: Option<String>,
    #[serde(default, rename = "category3_ID", deserialize_with = "empty_str_as_option_string")]
    pub category3_id: Option<String>,
    #[serde(default, rename = "category4_ID", deserialize_with = "empty_str_as_option_string")]
    pub category4_id: Option<String>,
    #[serde(default, rename = "category5_ID", deserialize_with = "empty_str_as_option_string")]
    pub category5_id: Option<String>,
    #[serde(default, rename = "category6_ID", deserialize_with = "empty_str_as_option_string")]
    pub category6_id: Option<String>,

    #[serde(default)]
    #[serde(rename = "HSH_code")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub hsh_code: Option<String>,

    #[serde(default)]
    #[serde(rename = "HSH_name")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub hsh_name: Option<String>,

    #[serde(default)]
    pub margin: Option<f64>,

    #[serde(default)]
    #[serde(rename = "freightfac")]
    pub freight_factor: Option<f64>,

    #[serde(default)]
    #[serde(rename = "currency_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub currency_id: Option<String>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameTranslation)
}

pub(super) struct NameTranslation;
impl SyncTranslation for NameTranslation {
    fn table_name(&self) -> &str {
        "name"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![CurrencyTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Name)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                let is_name_record = self.change_log_type().as_ref() == Some(&row.table_name);

                if !is_name_record {
                    return false;
                }

                // Check if we're the central server, if we are don't push changes received from remote sites
                // Otherwise we could end up syncing changes back to the site they came from
                if CentralServerConfig::is_central_server() && row.source_site_id.is_some() {
                    log::debug!(
                        "Not pushing name update from remote site back to central for id: {}",
                        row.record_id
                    );
                    return false;
                }

                true
            }
            // We are also pushing to omsupply central so that it's available for
            // cross site patient details sharing, same for names_store_join
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let legacy: LegacyNameRow = sync_record.deserialize()?;

        // Preserve any existing `properties_v2` rather than overwriting the whole
        // blob: an OMS write path (patient custom-field edits) can author keys the
        // legacy importer doesn't own, and a v5 re-pull of an unchanged OG record
        // must not wipe them.
        let existing_properties = NameRowRepository::new(connection)
            .find_one_by_id(&legacy.id)?
            .and_then(|row| row.properties_v2);

        // The OG→OMS legacy import runs on the central server only. On central we
        // refresh the owned keys (custom_1/2/3) from OG and keep the rest; off
        // central we leave `properties_v2` untouched — it arrives via v7 instead.
        let properties = if CentralServerConfig::is_central_server() {
            merge_legacy_properties(
                existing_properties,
                build_legacy_properties(&legacy),
                LEGACY_NAME_OWNED_KEYS,
            )
        } else {
            existing_properties
        };

        let LegacyNameRow {
            id,
            name,
            code,
            r#type: legacy_type,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            female,
            date_of_birth,
            phone,
            charge_code,
            comment,
            country,
            address1,
            address2,
            email,
            website,
            is_manufacturer,
            is_donor,
            on_hold,
            next_of_kin_id,
            next_of_kin_name,
            created_date,
            national_health_number,
            is_deceased,
            created_datetime,
            gender,
            date_of_death,
            custom_data,
            custom_1: _,
            custom_2: _,
            custom_3: _,
            category1_id: _,
            category2_id: _,
            category3_id: _,
            category4_id: _,
            category5_id: _,
            category6_id: _,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
        } = legacy;

        // Custom data for facility or name only (for others, say patient, don't need to have extra overhead or push translation back to json)
        let r#type = legacy_type.to_name_type();
        let custom_data_string = r#type
            .is_facility_or_store()
            .then(|| custom_data.as_ref().map(serde_json::to_string))
            .flatten()
            .transpose()
            .context("Error serialising custom data to string")?;

        // No DB-level FK constraint on supplying_store_id, because the store records also rely on name.
        // We don't want to blank out supplying_store_id if the store record just hasn't been synced yet

        let currency_id = clear_invalid_fk(
            connection,
            "name",
            &id,
            "currency_id",
            currency_id,
            |c, id| CurrencyRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        let result = NameRow {
            id,
            name,
            r#type,
            code,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            date_of_birth,
            phone,
            charge_code,
            comment,
            country,
            address1,
            address2,
            email,
            website,
            is_manufacturer,
            is_donor,
            on_hold,
            next_of_kin_id,
            next_of_kin_name,
            is_deceased,
            national_health_number,
            gender: gender.or(if legacy_type == LegacyNameRowType::Patient {
                if female {
                    Some(GenderType::Female)
                } else {
                    Some(GenderType::Male)
                }
            } else {
                None
            }),
            created_datetime: created_datetime
                .or(created_date.map(|date| date.and_hms_opt(0, 0, 0).unwrap())),
            date_of_death,
            custom_data_string,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
            deleted_datetime: None,
            properties_v2: properties,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(NameRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::Name(name_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };
        let NameRow {
            id,
            name,
            code,
            r#type,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            gender,
            date_of_birth,
            phone,
            charge_code,
            comment,
            country,
            address1,
            address2,
            email,
            website,
            is_manufacturer,
            is_donor,
            on_hold,
            next_of_kin_id,
            next_of_kin_name,
            created_datetime,
            is_deceased,
            date_of_death,
            national_health_number,
            deleted_datetime,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
            // See comment in pull translation
            custom_data_string: _,
            properties_v2,
        } = name_row;
        if deleted_datetime.is_some() {
            return Ok(PushTranslateResult::Ignored(
                "Ignore pushing soft deleted name".to_string(),
            ));
        }

        let patient_type = match r#type {
            NameRowType::Patient => LegacyNameRowType::Patient,
            _ => {
                return Ok(PushTranslateResult::Ignored(
                    "Only push name records that belong to patients".to_string(),
                ))
            }
        };

        let legacy_row = LegacyNameRow {
            id,
            name,
            code,
            r#type: patient_type,
            is_customer,
            is_supplier,
            supplying_store_id,
            first_name,
            last_name,
            female: gender
                .clone()
                .map(|g| g == GenderType::Female)
                .unwrap_or(false),
            date_of_birth,
            phone,
            charge_code,
            comment,
            country,
            address1,
            address2,
            email,
            website,
            is_manufacturer,
            is_donor,
            on_hold,
            next_of_kin_id,
            next_of_kin_name,
            created_date: created_datetime.map(|datetime| datetime.date()),
            national_health_number,
            is_deceased,
            created_datetime,
            gender,
            date_of_death,
            hsh_code,
            hsh_name,
            margin,
            freight_factor,
            currency_id,
            custom_data: None,
            // Reverse of `build_legacy_properties`: carry the patient's
            // `properties_v2` custom fields back into the legacy custom1/2/3 wire
            // columns. This wiring is currently INERT for OMS-originated names —
            // the `PushToLegacyCentral` guard (see `should_translate_to_sync_record`,
            // added by #9430 for the patient-DOB round-trip bug) blocks the push.
            // It's wired here so that if/when the general patient → OG sync path is
            // re-enabled, patient property edits flow back to OG automatically.
            custom_1: legacy_custom_field_from_properties(&properties_v2, "custom_1"),
            custom_2: legacy_custom_field_from_properties(&properties_v2, "custom_2"),
            custom_3: legacy_custom_field_from_properties(&properties_v2, "custom_3"),
            // Same inert reverse-mapping for the category dimensions: the stored
            // option id is the leaf `categoryN_ID`. Carried back behind the same
            // `PushToLegacyCentral` guard as the custom fields.
            category1_id: legacy_custom_field_from_properties(&properties_v2, "name_category1"),
            category2_id: legacy_custom_field_from_properties(&properties_v2, "name_category2"),
            category3_id: legacy_custom_field_from_properties(&properties_v2, "name_category3"),
            category4_id: legacy_custom_field_from_properties(&properties_v2, "name_category4"),
            category5_id: legacy_custom_field_from_properties(&properties_v2, "name_category5"),
            category6_id: legacy_custom_field_from_properties(&properties_v2, "name_category6"),
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    // TODO soft delete
    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        CurrencyRow, SyncAction, SyncRecordData,
    };
    use serde_json::json;

    fn legacy_row_with_customs(
        custom_1: Option<&str>,
        custom_2: Option<&str>,
        custom_3: Option<&str>,
    ) -> LegacyNameRow {
        LegacyNameRow {
            id: "id".to_string(),
            name: "n".to_string(),
            code: "c".to_string(),
            r#type: LegacyNameRowType::Patient,
            is_customer: false,
            is_supplier: false,
            supplying_store_id: None,
            first_name: None,
            last_name: None,
            female: false,
            date_of_birth: None,
            phone: None,
            charge_code: None,
            comment: None,
            country: None,
            address1: None,
            address2: None,
            email: None,
            website: None,
            is_manufacturer: false,
            is_donor: false,
            on_hold: false,
            next_of_kin_id: None,
            next_of_kin_name: None,
            created_date: None,
            national_health_number: None,
            is_deceased: false,
            created_datetime: None,
            gender: None,
            date_of_death: None,
            custom_data: None,
            custom_1: custom_1.map(String::from),
            custom_2: custom_2.map(String::from),
            custom_3: custom_3.map(String::from),
            category1_id: None,
            category2_id: None,
            category3_id: None,
            category4_id: None,
            category5_id: None,
            category6_id: None,
            hsh_code: None,
            hsh_name: None,
            margin: None,
            freight_factor: None,
            currency_id: None,
        }
    }

    #[test]
    fn build_legacy_properties_none_when_all_absent() {
        let row = legacy_row_with_customs(None, None, None);
        assert_eq!(build_legacy_properties(&row), None);
    }

    #[test]
    fn build_legacy_properties_skips_absent_fields() {
        let row = legacy_row_with_customs(Some("Red"), None, Some("Blue"));
        assert_eq!(
            build_legacy_properties(&row),
            Some(json!({"custom_1": "Red", "custom_3": "Blue"}))
        );
    }

    #[test]
    fn build_legacy_properties_all_three() {
        let row = legacy_row_with_customs(Some("A"), Some("B"), Some("C"));
        assert_eq!(
            build_legacy_properties(&row),
            Some(json!({"custom_1": "A", "custom_2": "B", "custom_3": "C"}))
        );
    }

    #[test]
    fn build_legacy_properties_categories() {
        // Categories are stored as OPTION ids alongside the custom fields; empty
        // / absent dimensions are omitted (untouched rows stay clean).
        let mut row = legacy_row_with_customs(None, None, None);
        row.category1_id = Some("CAT1_LEAF".to_string());
        row.category3_id = Some("CAT3".to_string());
        row.category6_id = Some("".to_string()); // empty → omitted
        assert_eq!(
            build_legacy_properties(&row),
            Some(json!({ "name_category_1": "CAT1_LEAF", "name_category_3": "CAT3" }))
        );
    }

    #[test]
    fn merge_preserves_oms_key_while_refreshing_category() {
        // A category edit on a patient lives under an owned key, so a central
        // re-import refreshes it from OG; a non-owned OMS key is preserved.
        let mut row = legacy_row_with_customs(None, None, None);
        row.category2_id = Some("OG_VALUE".to_string());
        let existing = Some(json!({ "name_category_2": "OMS_EDIT", "patient_note": "keep" }));
        assert_eq!(
            merge_legacy_properties(existing, build_legacy_properties(&row), LEGACY_NAME_OWNED_KEYS),
            Some(json!({ "name_category_2": "OG_VALUE", "patient_note": "keep" }))
        );
    }

    #[test]
    fn legacy_custom_field_from_properties_extracts_string_values() {
        // Inverse of build_legacy_properties: present string keys map back to the
        // legacy custom columns; absent/non-string keys and a NULL blob → None.
        let properties = Some(json!({ "custom_1": "A", "custom_3": 42, "other": "x" }));
        assert_eq!(
            legacy_custom_field_from_properties(&properties, "custom_1"),
            Some("A".to_string())
        );
        // absent key
        assert_eq!(legacy_custom_field_from_properties(&properties, "custom_2"), None);
        // non-string value is not pushed to a TEXT column
        assert_eq!(legacy_custom_field_from_properties(&properties, "custom_3"), None);
        // NULL blob
        assert_eq!(legacy_custom_field_from_properties(&None, "custom_1"), None);
    }

    #[test]
    fn legacy_properties_only_derived_on_central() {
        use crate::sync::{test_util_set_is_central_server, CentralServerConfig};
        let row = legacy_row_with_customs(Some("Red"), None, Some("Blue"));

        // Replicates the pull translator's branch: off central the existing blob is
        // preserved untouched (no local derivation); on central the owned keys are
        // refreshed from OG and merged into whatever else the blob holds.
        let derive = |existing: Option<serde_json::Value>| {
            if CentralServerConfig::is_central_server() {
                merge_legacy_properties(
                    existing,
                    build_legacy_properties(&row),
                    LEGACY_NAME_OWNED_KEYS,
                )
            } else {
                existing
            }
        };

        // A V5V6 remote must not derive properties locally, even when the legacy
        // custom fields are present on the wire — the existing blob is preserved.
        test_util_set_is_central_server(false);
        assert_eq!(derive(None), None);
        assert_eq!(
            derive(Some(json!({"patient_note": "keep"}))),
            Some(json!({"patient_note": "keep"}))
        );

        // The central server derives the owned keys and merges them with the
        // existing OMS-authored keys (and fans the result out over v7).
        test_util_set_is_central_server(true);
        assert_eq!(derive(None), Some(json!({"custom_1": "Red", "custom_3": "Blue"})));
        assert_eq!(
            derive(Some(json!({"patient_note": "keep"}))),
            Some(json!({"custom_1": "Red", "custom_3": "Blue", "patient_note": "keep"}))
        );

        // Reset shared state for other tests (cargo test runs in-process).
        test_util_set_is_central_server(false);
    }

    #[actix_rt::test]
    async fn test_name_translation() {
        use crate::sync::test::test_data::name as test_data;
        use crate::sync::test_util_set_is_central_server;
        let translator = NameTranslation {};

        // The properties-v2 import (name_7 fixture) only derives on central,
        // mirroring where the OG→OMS import actually runs (COMS). Other name
        // fixtures carry no custom fields, so this doesn't affect them.
        test_util_set_is_central_server(true);

        // FK validation: NEW_ZEALAND_DOLLARS currency and store_a need to exist.
        // mock_currencies() doesn't include NEW_ZEALAND_DOLLARS so we add it explicitly.
        let (_, connection, _, _) = setup_all_with_data(
            "test_name_translation",
            MockDataInserts::none().names().stores(),
            MockData {
                currencies: vec![CurrencyRow {
                    id: "NEW_ZEALAND_DOLLARS".to_string(),
                    code: "NZD".to_string(),
                    rate: 1.6,
                    is_home_currency: false,
                    date_updated: None,
                    is_active: true,
                }],
                ..Default::default()
            },
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            // TODO add match record here
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap_or_else(|_| {
                    panic!(
                        "Error translating from upsert sync record {:?}",
                        record.sync_buffer_row.record_id
                    )
                });

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap_or_else(|_| {
                    panic!(
                        "Error translating from delete sync record {:?}",
                        record.sync_buffer_row.record_id
                    )
                });

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_name_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = NameTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_name_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "name".to_string(),
            record_id: "NAME_FK_INVALID".to_string(),
            data: SyncRecordData(
                serde_json::from_str(
                    r#"{
                "ID": "NAME_FK_INVALID",
                "name": "Bad FK Name",
                "code": "code",
                "type": "facility",
                "customer": false,
                "supplier": false,
                "supplying_store_id": "does_not_exist_store",
                "first": "",
                "last": "",
                "female": false,
                "date_of_birth": "0000-00-00",
                "phone": "",
                "charge code": "",
                "comment": "",
                "country": "",
                "bill_address1": "",
                "bill_address2": "",
                "email": "",
                "url": "",
                "manufacturer": false,
                "donor": false,
                "hold": false,
                "NEXT_OF_KIN_ID": "",
                "next_of_kin_relative": "",
                "created_date": "0000-00-00",
                "national_health_number": "",
                "isDeceased": false,
                "om_created_datetime": "",
                "om_gender": "",
                "currency_ID": "does_not_exist_currency"
            }"#,
                )
                .unwrap(),
            ),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_record)
            .unwrap();
        let debug = format!("{result:?}");
        // supplying_store_id has no DB-level FK constraint (store depends on name so we can't
        // validate ordering), so it is passed through as-is.
        assert!(
            debug.contains("supplying_store_id: Some(\"does_not_exist_store\")"),
            "{}",
            format!("expected supplying_store_id to pass through unchanged; got:\n{debug}")
        );
        assert!(
            debug.contains("currency_id: None"),
            "{}",
            format!("expected currency_id None; got:\n{debug}")
        );

        let logs = SystemLogRowRepository::new(&connection).find_all().unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        // Only currency_id is validated (supplying_store_id skipped — no DB FK)
        assert_eq!(fk_errors.len(), 1, "got {fk_errors:?}");
    }
}
