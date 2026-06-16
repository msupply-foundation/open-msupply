//! Snapshot of the open-mSupply **sync schema** (the sync API wire-format contract), used to detect
//! breaking changes to the sync API in CI.
//!
//! The contract has three layers that can break compatibility with sites running older builds:
//!  - the **envelope / protocol** types ([`SyncEnvelopeContract`]): the V5 records this site pushes
//!    to legacy mSupply central, and the V6 request/response/payload types exchanged with
//!    open-mSupply central;
//!  - the **per-record translators**: every `SyncTranslation` serialises a `Legacy*` struct (legacy
//!    mSupply) or a repository `*Row` struct (open-mSupply central) to the wire — a renamed,
//!    removed or retyped field here silently breaks sync (this is exactly what happened in the
//!    v2.16 -> v2.17 `name_id` / `name_link_id` regression);
//!  - the **version window** this build sends and accepts.
//!
//! [`sync_schema`] serialises all three into a single deterministic JSON document, checked in at
//! `server/sync-schema.json` and regenerated via
//! `cargo run --bin remote_server_cli -- export-sync-schema`. A drift between the generated value
//! and the committed file (see [`tests::sync_schema_snapshot_is_up_to_date`] and
//! `.github/workflows/sync-schema-compatibility.yaml`) means the wire format changed — which must
//! be reviewed as a potential breaking change and, where relevant, paired with a version bump.
//!
//! Per-translator schemas are emitted independently (one self-contained `schema_for!` per
//! translator) rather than merged into one namespace: two translators legitimately define distinct
//! types with the same name (e.g. `LegacyListMasterRow`, `LegacyOptionsType`), and keeping each
//! schema self-contained both avoids the name clash and localises diffs to the affected translator.

use schemars::schema_for;
use serde_json::{json, Value};

use super::{
    api::{
        CommonSyncRecord, ParsedError, RemoteSyncBatchV5, RemoteSyncRecordV5, SyncAction,
        SyncApiSettings,
    },
    api_v6::{
        SiteStatusRequestV6, SiteStatusResponseV6, SiteStatusV6, SyncBatchV6,
        SyncDownloadFileRequestV6, SyncParsedErrorV6, SyncPatientPullRequestV6, SyncPullRequestV6,
        SyncPullResponseV6, SyncPushRequestV6, SyncPushResponseV6, SyncPushSuccessV6, SyncRecordV6,
        SyncUploadFileRequestV6, SyncUploadFileResponseV6,
    },
    settings::{SYNC_V5_VERSION, SYNC_V6_VERSION},
    sync_on_central::supported_sync_v6_version_range,
    translations::all_translators,
};

/// Aggregates every type that appears on the sync **envelope** so a single `schema_for!` call
/// captures the whole protocol, with shared types de-duplicated into `definitions`. Mirrors the
/// `PluginTypes` pattern used for ts-rs exports. The fields are never read — the struct exists only
/// to drive schema generation, so every field name maps to a wire type for readability.
#[derive(schemars::JsonSchema)]
#[allow(dead_code)]
struct SyncEnvelopeContract {
    // --- Record envelope shared by the V5 and V6 protocols ---
    common_sync_record: CommonSyncRecord,
    sync_action: SyncAction,
    sync_api_settings: SyncApiSettings,

    // --- V5: what this site sends to / parses from the legacy mSupply central server ---
    remote_sync_batch_v5: RemoteSyncBatchV5,
    remote_sync_record_v5: RemoteSyncRecordV5,
    parsed_error_v5: ParsedError,

    // --- V6 requests (open-mSupply remote -> open-mSupply central) ---
    sync_pull_request_v6: SyncPullRequestV6,
    sync_push_request_v6: SyncPushRequestV6,
    sync_patient_pull_request_v6: SyncPatientPullRequestV6,
    site_status_request_v6: SiteStatusRequestV6,
    sync_download_file_request_v6: SyncDownloadFileRequestV6,
    sync_upload_file_request_v6: SyncUploadFileRequestV6,

    // --- V6 responses ---
    sync_pull_response_v6: SyncPullResponseV6,
    sync_push_response_v6: SyncPushResponseV6,
    site_status_response_v6: SiteStatusResponseV6,
    sync_upload_file_response_v6: SyncUploadFileResponseV6,

    // --- V6 payloads / errors ---
    sync_batch_v6: SyncBatchV6,
    sync_record_v6: SyncRecordV6,
    sync_push_success_v6: SyncPushSuccessV6,
    site_status_v6: SiteStatusV6,
    sync_parsed_error_v6: SyncParsedErrorV6,
}

/// Build a map of `translator key -> JSON Schema of the wire type it (de)serialises`. Each entry is
/// an independent `schema_for!` so name clashes across translators can't collide and diffs stay
/// localised. The key is the translator's module path (unique); `table_name` lives in the registry
/// manifest below.
macro_rules! record_schemas {
    ($($key:literal => $ty:ty),* $(,)?) => {{
        let mut map = serde_json::Map::new();
        $(
            map.insert(
                $key.to_string(),
                serde_json::to_value(schema_for!($ty)).expect("wire record schema must serialise"),
            );
        )*
        Value::Object(map)
    }};
}

fn translator_record_schemas() -> Value {
    record_schemas! {
        "invoice" => crate::sync::translations::invoice::LegacyTransactRow,
        "invoice_line" => crate::sync::translations::invoice_line::LegacyTransLineRow,
        "requisition" => crate::sync::translations::requisition::LegacyRequisitionRow,
        "requisition_line" => crate::sync::translations::requisition_line::LegacyRequisitionLineRow,
        "stocktake" => crate::sync::translations::stocktake::LegacyStocktakeRow,
        "stocktake_line" => crate::sync::translations::stocktake_line::LegacyStocktakeLineRow,
        "stock_line" => crate::sync::translations::stock_line::LegacyStockLineRow,
        "stock_relocation" => crate::sync::translations::stock_relocation::LegacyReplenishmentRow,
        "location" => crate::sync::translations::location::LegacyLocationRow,
        "location_movement" => crate::sync::translations::location_movement::LegacyLocationMovementRow,
        "location_type" => crate::sync::translations::location_type::LegacyLocationTypeRow,
        "name" => crate::sync::translations::name::LegacyNameRow,
        "name_store_join" => crate::sync::translations::name_store_join::LegacyNameStoreJoinRow,
        "name_tag" => crate::sync::translations::name_tag::LegacyNameTagRow,
        "name_tag_join" => crate::sync::translations::name_tag_join::LegacyNameTagJoinRow,
        "name_insurance_join" => crate::sync::translations::name_insurance_join::LegacyNameInsuranceJoinRow,
        "master_list" => crate::sync::translations::master_list::LegacyListMasterRow,
        "master_list_line" => crate::sync::translations::master_list_line::LegacyListMasterLineRow,
        "master_list_name_join" => crate::sync::translations::master_list_name_join::LegacyListMasterNameJoinRow,
        "item" => crate::sync::translations::item::LegacyItemRow,
        "item_direction" => crate::sync::translations::item_direction::LegacyItemDirectionRow,
        "item_store_join" => crate::sync::translations::item_store_join::LegacyItemStoreJoinRow,
        "item_warning_join" => crate::sync::translations::item_warning_join::LegacyItemWarningJoinRow,
        "unit" => crate::sync::translations::unit::LegacyUnitRow,
        "currency" => crate::sync::translations::currency::LegacyCurrencyRow,
        "clinician" => crate::sync::translations::clinician::LegacyClinicianRow,
        "clinician_store_join" => crate::sync::translations::clinician_store_join::LegacyClinicianStoreJoinRow,
        "contact" => crate::sync::translations::contact::LegacyContactRow,
        "user" => crate::sync::translations::user::LegacyUserTable,
        "user_permission" => crate::sync::translations::user_permission::LegacyUserPermissionTable,
        "store" => crate::sync::translations::store::LegacyStoreRow,
        "store_preference" => crate::sync::translations::store_preference::LegacyPrefRow,
        "period" => crate::sync::translations::period::LegacyPeriodRow,
        "period_schedule" => crate::sync::translations::period_schedule::LegacyPeriodScheduleRow,
        "program_indicator" => crate::sync::translations::program_indicator::LegacyProgramIndicator,
        "program_requisition_settings" => crate::sync::translations::program_requisition_settings::LegacyListMasterRow,
        "indicator_attribute" => crate::sync::translations::indicator_attribute::LegacyIndicatorAttribute,
        "indicator_value" => crate::sync::translations::indicator_value::LegacyIndicatorValue,
        "reason" => crate::sync::translations::reason::LegacyOptionsRow,
        "diagnosis" => crate::sync::translations::diagnosis::LegacyDiagnosisRow,
        "category" => crate::sync::translations::category::LegacyItemCategoryRow,
        "abbreviation" => crate::sync::translations::abbreviation::LegacyAbbreviationRow,
        "barcode" => crate::sync::translations::barcode::LegacyBarcodeRow,
        "warning" => crate::sync::translations::warning::LegacyWarningRow,
        "insurance_provider" => crate::sync::translations::insurance_provider::LegacyInsuranceProvider,
        "shipping_method" => crate::sync::translations::shipping_method::LegacyShippingMethod,
        "sensor" => crate::sync::translations::sensor::LegacySensorRow,
        "temperature_breach" => crate::sync::translations::temperature_breach::LegacyTemperatureBreachRow,
        "temperature_log" => crate::sync::translations::temperature_log::LegacyTemperatureLogRow,
        "vvm_status" => crate::sync::translations::vvm_status::LegacyVVMStatusRow,
        "vvm_status_log" => crate::sync::translations::vvm_status_log::LegacyVVMStatusLogRow,
        "activity_log" => crate::sync::translations::activity_log::LegacyActivityLogRow,
        "document" => crate::sync::translations::document::LegacyDocumentRow,
        "document_registry" => crate::sync::translations::document_registry::LegacyDocumentRegistryRow,
        "form_schema" => crate::sync::translations::form_schema::LegacyFormSchemaRow,
        "encounter_legacy" => crate::sync::translations::encounter_legacy::LegacyEncounterRow,
        "purchase_order" => crate::sync::translations::purchase_order::LegacyPurchaseOrderRow,
        "purchase_order_line" => crate::sync::translations::purchase_order_line::LegacyPurchaseOrderLineRow,
        "goods_received" => crate::sync::translations::goods_received::LegacyGoodsReceivedRow,
        "goods_received_line" => crate::sync::translations::goods_received_line::LegacyGoodsReceivedLineRow,
        "vaccination_legacy" => crate::sync::translations::vaccination_legacy::LegacyVaccinationRow,
        "vaccine_course_legacy" => crate::sync::translations::vaccine_course_legacy::LegacyVaccineCourseRow,
        "vaccine_course_dose_legacy" => crate::sync::translations::vaccine_course_dose_legacy::LegacyVaccineCourseDoseRow,
        "vaccine_course_item_legacy" => crate::sync::translations::vaccine_course_item_legacy::LegacyVaccineCourseItemRow,
        "sync_message" => crate::sync::translations::sync_message::LegacyMessageRow,
        "special_name_merge" => crate::sync::translations::special::name_merge::NameMergeMessage,
        "special_item_merge" => crate::sync::translations::special::item_merge::ItemMergeMessage,
        "special_clinician_merge" => crate::sync::translations::special::clinician_merge::ClinicianMergeMessage,
        "special_name_to_name_store_join" => crate::sync::translations::special::name_to_name_store_join::PartialLegacyNameRow,
        "rnr_form" => repository::RnRFormRow,
        "rnr_form_line" => repository::RnRFormLineRow,
        "item_variant" => repository::item_variant::item_variant_row::ItemVariantRow,
        "packaging_variant" => repository::item_variant::packaging_variant_row::PackagingVariantRow,
        "vaccination" => repository::VaccinationRow,
        "vaccine_course" => repository::vaccine_course::vaccine_course_row::VaccineCourseRow,
        "vaccine_course_dose" => repository::vaccine_course::vaccine_course_dose_row::VaccineCourseDoseRow,
        "vaccine_course_item" => repository::vaccine_course::vaccine_course_item_row::VaccineCourseItemRow,
        "vaccine_course_store_config" => repository::vaccine_course::vaccine_course_store_config_row::VaccineCourseStoreConfigRow,
        "asset" => repository::asset_row::AssetRow,
        "asset_catalogue_item" => repository::asset_catalogue_item_row::AssetCatalogueItemRow,
        "asset_catalogue_type" => repository::asset_type_row::AssetTypeRow,
        "asset_category" => repository::asset_category_row::AssetCategoryRow,
        "asset_class" => repository::asset_class_row::AssetClassRow,
        "asset_internal_location" => repository::asset_internal_location_row::AssetInternalLocationRow,
        "asset_log" => repository::asset_log_row::AssetLogRow,
        "asset_log_reason" => repository::asset_log_reason_row::AssetLogReasonRow,
        "asset_property" => repository::asset_property_row::AssetPropertyRow,
        "ancillary_item" => repository::AncillaryItemRow,
        "campaign" => repository::campaign::campaign_row::CampaignRow,
        "demographic" => repository::DemographicRow,
        "backend_plugin" => repository::BackendPluginRow,
        "frontend_plugin" => repository::FrontendPluginRow,
        "plugin_data" => repository::PluginDataRow,
        "preference" => repository::PreferenceRow,
        "report" => repository::ReportRow,
        "om_form_schema" => repository::FormSchemaJson,
        "sync_file_reference" => repository::SyncFileReferenceWire,
        "sync_message_om" => repository::SyncMessageRow,
        "system_log" => repository::system_log_row::SystemLogRow,
        "contact_form" => repository::contact_form_row::ContactFormRow,
        "name_oms_fields" => repository::NameOmsFieldsRow,
        "name_property" => repository::NamePropertyRow,
        "property" => repository::PropertyRow,
    }
}

/// Registry manifest: every translator's `table_name`(s) and `change_log_type`, walked from
/// `all_translators()`. Catches added / removed / renamed translators, tables and changelog types
/// even for translators whose record schema isn't (yet) listed above. Sorted for a stable,
/// reorder-insensitive diff.
fn translator_registry_manifest() -> Value {
    let mut entries: Vec<(String, Value)> = all_translators()
        .iter()
        .map(|t| {
            let table_names = t.table_names();
            let change_log_type = t.change_log_type().map(|c| format!("{:?}", c));
            let sort_key = format!("{}|{:?}", table_names.join(","), change_log_type);
            (
                sort_key,
                json!({
                    "table_names": table_names,
                    "change_log_type": change_log_type,
                }),
            )
        })
        .collect();
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    Value::Array(entries.into_iter().map(|(_, v)| v).collect())
}

/// Build the sync schema (wire-format contract) snapshot as a JSON value.
pub fn sync_schema() -> Value {
    let (sync_v6_accepted_min, sync_v6_accepted_max) = supported_sync_v6_version_range();

    json!({
        "$comment": concat!(
            "GENERATED FILE - do not edit by hand. Snapshot of the open-mSupply sync schema ",
            "(wire-format contract), used to detect breaking sync API changes in CI. Regenerate ",
            "with `cargo run --bin remote_server_cli -- export-sync-schema`. See ",
            ".github/workflows/sync-schema-compatibility.yaml and service/src/sync/sync_schema.rs."
        ),
        "versions": {
            "sync_v5_version_sent": SYNC_V5_VERSION,
            "sync_v6_version_sent": SYNC_V6_VERSION,
            "sync_v6_accepted_min": sync_v6_accepted_min,
            "sync_v6_accepted_max": sync_v6_accepted_max,
        },
        "envelope": schema_for!(SyncEnvelopeContract),
        "translators": {
            "registry": translator_registry_manifest(),
            "record_schemas": translator_record_schemas(),
        },
    })
}

/// Pretty-printed, newline-terminated form of [`sync_schema`]. `serde_json::Value` orders object
/// keys via a `BTreeMap`, so the output is deterministic and stable for git diffing.
pub fn sync_schema_string() -> String {
    let mut out =
        serde_json::to_string_pretty(&sync_schema()).expect("sync schema must serialise");
    out.push('\n');
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The committed snapshot (`server/sync-schema.json`) must match what the code generates.
    /// `include_str!` is resolved relative to this file: `server/service/src/sync/` + `../../../`
    /// = `server/`. Drift means the sync wire format changed — regenerate and review for breaking
    /// changes before committing.
    #[test]
    fn sync_schema_snapshot_is_up_to_date() {
        let committed = include_str!("../../../sync-schema.json");
        let generated = sync_schema_string();
        pretty_assertions::assert_eq!(
            committed,
            generated,
            "sync schema drifted from the committed snapshot. Regenerate with: \
             cargo run --bin remote_server_cli -- export-sync-schema"
        );
    }
}
