use std::cell::RefCell;
use std::collections::HashSet;

use chrono::Utc;
use repository::{
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    AssetCatalogueItemRowRepository, AssetCategoryRowRepository, AssetClassRowRepository,
    AssetLogReasonRowRepository, AssetRowRepository, AssetTypeRowRepository, BarcodeRowRepository,
    CampaignRowRepository, CategoryRowRepository, ClinicianLinkRowRepository, ContextRowRepository,
    CurrencyRowRepository, DemographicRowRepository, DiagnosisRowRepository,
    FormSchemaRowRepository, IndicatorColumnRowRepository, IndicatorLineRowRepository,
    InsuranceProviderRowRepository, InvoiceLineRowRepository, InvoiceRowRepository,
    ItemLinkRowRepository, ItemRowRepository, ItemVariantRowRepository, LocationRowRepository,
    LocationTypeRowRepository, MasterListRowRepository, NameInsuranceJoinRowRepository,
    NameLinkRowRepository, NameTagRowRepository, PeriodRowRepository, PeriodScheduleRowRepository,
    ProgramIndicatorRowRepository, ProgramRowRepository, PropertyRowRepository,
    PurchaseOrderLineRowRepository, PurchaseOrderRowRepository, ReasonOptionRowRepository,
    RepositoryError, RequisitionRowRepository, RnRFormRowRepository, SensorRowRepository,
    ShippingMethodRowRepository, StockLineRowRepository, StocktakeRowRepository, StorageConnection,
    StoreRowRepository, TemperatureBreachRowRepository, UnitRowRepository, VVMStatusRowRepository,
    VaccineCourseDoseRowRepository, VaccineCourseRowRepository, WarningRowRepository,
};
use util::uuid::uuid;

/// The target table of an optional foreign key cleared during sync translation.
///
/// Each variant maps to the repository used to check whether the referenced record exists.
/// Used with [`FkChecker`] to validate FKs while caching known-existing ids across a batch.
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub(crate) enum FkField {
    Asset,
    AssetCatalogueItem,
    AssetCatalogueType,
    AssetCategory,
    AssetClass,
    AssetLogReason,
    Barcode,
    Campaign,
    Category,
    ClinicianLink,
    Context,
    Currency,
    Demographic,
    Diagnosis,
    FormSchema,
    IndicatorColumn,
    IndicatorLine,
    InsuranceProvider,
    Invoice,
    InvoiceLine,
    Item,
    ItemLink,
    ItemVariant,
    Location,
    LocationType,
    MasterList,
    NameInsuranceJoin,
    NameLink,
    NameTag,
    Period,
    PeriodSchedule,
    Program,
    ProgramIndicator,
    Property,
    PurchaseOrder,
    PurchaseOrderLine,
    ReasonOption,
    Requisition,
    RnrForm,
    Sensor,
    ShippingMethod,
    StockLine,
    Stocktake,
    Store,
    TemperatureBreach,
    Unit,
    VaccineCourse,
    VaccineCourseDose,
    VvmStatus,
    Warning,
}

impl FkField {
    fn exists(&self, connection: &StorageConnection, id: &str) -> Result<bool, RepositoryError> {
        match self {
            FkField::Asset => AssetRowRepository::new(connection).check_exists_by_id(id),
            FkField::AssetCatalogueItem => {
                AssetCatalogueItemRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::AssetCatalogueType => {
                AssetTypeRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::AssetCategory => {
                AssetCategoryRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::AssetClass => AssetClassRowRepository::new(connection).check_exists_by_id(id),
            FkField::AssetLogReason => {
                AssetLogReasonRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Barcode => BarcodeRowRepository::new(connection).check_exists_by_id(id),
            FkField::Campaign => CampaignRowRepository::new(connection).check_exists_by_id(id),
            FkField::Category => CategoryRowRepository::new(connection).check_exists_by_id(id),
            FkField::ClinicianLink => {
                ClinicianLinkRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Context => ContextRowRepository::new(connection).check_exists_by_id(id),
            FkField::Currency => CurrencyRowRepository::new(connection).check_exists_by_id(id),
            FkField::Demographic => {
                DemographicRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Diagnosis => DiagnosisRowRepository::new(connection).check_exists_by_id(id),
            FkField::FormSchema => FormSchemaRowRepository::new(connection).check_exists_by_id(id),
            FkField::IndicatorColumn => {
                IndicatorColumnRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::IndicatorLine => {
                IndicatorLineRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::InsuranceProvider => {
                InsuranceProviderRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Invoice => InvoiceRowRepository::new(connection).check_exists_by_id(id),
            FkField::InvoiceLine => {
                InvoiceLineRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Item => ItemRowRepository::new(connection).check_exists_by_id(id),
            FkField::ItemLink => ItemLinkRowRepository::new(connection).check_exists_by_id(id),
            FkField::ItemVariant => {
                ItemVariantRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Location => LocationRowRepository::new(connection).check_exists_by_id(id),
            FkField::LocationType => {
                LocationTypeRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::MasterList => MasterListRowRepository::new(connection).check_exists_by_id(id),
            FkField::NameInsuranceJoin => {
                NameInsuranceJoinRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::NameLink => NameLinkRowRepository::new(connection).check_exists_by_id(id),
            FkField::NameTag => NameTagRowRepository::new(connection).check_exists_by_id(id),
            FkField::Period => PeriodRowRepository::new(connection).check_exists_by_id(id),
            FkField::PeriodSchedule => {
                PeriodScheduleRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Program => ProgramRowRepository::new(connection).check_exists_by_id(id),
            FkField::ProgramIndicator => {
                ProgramIndicatorRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Property => PropertyRowRepository::new(connection).check_exists_by_id(id),
            FkField::PurchaseOrder => {
                PurchaseOrderRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::PurchaseOrderLine => {
                PurchaseOrderLineRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::ReasonOption => {
                ReasonOptionRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Requisition => {
                RequisitionRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::RnrForm => RnRFormRowRepository::new(connection).check_exists_by_id(id),
            FkField::Sensor => SensorRowRepository::new(connection).check_exists_by_id(id),
            FkField::ShippingMethod => {
                ShippingMethodRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::StockLine => StockLineRowRepository::new(connection).check_exists_by_id(id),
            FkField::Stocktake => StocktakeRowRepository::new(connection).check_exists_by_id(id),
            FkField::Store => StoreRowRepository::new(connection).check_exists_by_id(id),
            FkField::TemperatureBreach => {
                TemperatureBreachRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::Unit => UnitRowRepository::new(connection).check_exists_by_id(id),
            FkField::VaccineCourse => {
                VaccineCourseRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::VaccineCourseDose => {
                VaccineCourseDoseRowRepository::new(connection).check_exists_by_id(id)
            }
            FkField::VvmStatus => VVMStatusRowRepository::new(connection).check_exists_by_id(id),
            FkField::Warning => WarningRowRepository::new(connection).check_exists_by_id(id),
        }
    }
}

/// Integration-scoped helper for validating optional foreign keys during sync translation.
///
/// Holds a positive-only cache of `(FkField, id)` pairs already confirmed to exist. The cache is
/// only ever populated with *found* records: a record that exists will keep existing for the rest
/// of integration (records are never removed mid-integration), so a cache hit is always safe. A
/// "not found" is never cached — a parent record may still be integrated later in the same run.
///
/// One `FkChecker` is created per integration and passed to every upsert translation. Inside a
/// translation, call [`FkChecker::with_table`] once to get a per-record `fk_check` closure.
pub(crate) struct FkChecker {
    existing: RefCell<HashSet<(FkField, String)>>,
}

impl FkChecker {
    pub(crate) fn new() -> Self {
        FkChecker {
            existing: RefCell::new(HashSet::new()),
        }
    }

    /// Returns a closure `fk_check(fk_id, fk_field_name, fk_field)` scoped to a single record,
    /// for the common case where a missing optional FK should always be logged.
    ///
    /// For each optional FK the closure:
    ///  - returns `Ok(None)` if the FK is `None`;
    ///  - returns `Ok(Some(id))` if the id is in the cache or exists in the DB (caching it);
    ///  - otherwise logs an error + inserts a `system_log` row of type `SyncTranslationFkError`,
    ///    and returns `Ok(None)` so the translated row can still be inserted.
    ///
    /// `record_id` is cloned into the closure (rather than borrowed) so the caller can still move
    /// the row's id field into the translated struct while using the closure in the same literal.
    ///
    /// For the rare case where a missing FK is expected and should not be logged (e.g. a
    /// foreign-site invoice line referencing a stock line that only exists on the remote site),
    /// call [`FkChecker::clear_invalid`] directly with `log_if_missing: false`.
    pub(crate) fn with_table<'a>(
        &'a self,
        connection: &'a StorageConnection,
        record_table: &'a str,
        record_id: &str,
    ) -> impl Fn(Option<String>, &str, FkField) -> Result<Option<String>, RepositoryError> + 'a
    {
        let record_id = record_id.to_string();
        move |fk_id, fk_field_name, fk_field| {
            self.clear_invalid(
                connection,
                record_table,
                &record_id,
                fk_id,
                fk_field_name,
                fk_field,
                true,
            )
        }
    }

    /// Like [`FkChecker::with_table`] but for required (NOT NULL) foreign keys: returns a closure
    /// `check_fk(fk_id, fk_field_name, fk_field)` that returns the id if it exists (caching it) or
    /// `Err` (with a `system_log` row) if it doesn't. See [`FkChecker::check_fk`].
    ///
    /// `record_id` is cloned into the closure so the caller can still move the row's id field into
    /// the translated struct while calling the closure in the same struct literal.
    pub(crate) fn with_table_required<'a>(
        &'a self,
        connection: &'a StorageConnection,
        record_table: &'a str,
        record_id: &str,
    ) -> impl Fn(String, &str, FkField) -> anyhow::Result<String> + 'a {
        let record_id = record_id.to_string();
        move |fk_id, fk_field_name, fk_field| {
            self.check_fk(
                connection,
                record_table,
                &record_id,
                fk_id,
                fk_field_name,
                fk_field,
            )
        }
    }

    /// Validate an optional foreign key, clearing it to `None` if the referenced record does not
    /// exist. Cache-aware (see the struct docs); only confirmed-existing ids are cached.
    ///
    /// Pass `log_if_missing: false` when a missing FK is expected and not operator-actionable.
    /// Most callers use the [`FkChecker::with_table`] closure instead, which always logs.
    pub(crate) fn clear_invalid(
        &self,
        connection: &StorageConnection,
        record_table: &str,
        record_id: &str,
        fk_id: Option<String>,
        fk_field_name: &str,
        fk_field: FkField,
        log_if_missing: bool,
    ) -> Result<Option<String>, RepositoryError> {
        let Some(id) = fk_id else {
            return Ok(None);
        };

        if self.existing.borrow().contains(&(fk_field, id.clone())) {
            return Ok(Some(id));
        }

        if fk_field.exists(connection, &id)? {
            self.existing.borrow_mut().insert((fk_field, id.clone()));
            return Ok(Some(id));
        }

        if log_if_missing {
            self.record_missing_fk(
                connection,
                &format!(
                    "Sync translation: foreign key not found, ensure the dependency was defined correctly in the translator. \
                     table={record_table}, record_id={record_id}, fk_field={fk_field_name}, fk_id={id}"
                ),
            )?;
        }

        Ok(None)
    }

    /// Validate a required (NOT NULL) foreign key. Returns the id unchanged if it exists (caching
    /// it); otherwise logs an error, inserts a `system_log` row of type `SyncTranslationFkError`,
    /// and returns `Err`.
    ///
    /// Use this for FK columns that are `NOT NULL` in the schema, where clearing to `None` is not
    /// an option. The error propagates out of the translator so the whole sync record is recorded
    /// as errored in the sync buffer with a clear message, instead of failing later during
    /// integration with a raw database foreign-key-violation.
    pub(crate) fn check_fk(
        &self,
        connection: &StorageConnection,
        record_table: &str,
        record_id: &str,
        fk_id: String,
        fk_field_name: &str,
        fk_field: FkField,
    ) -> anyhow::Result<String> {
        if self.existing.borrow().contains(&(fk_field, fk_id.clone())) {
            return Ok(fk_id);
        }

        if fk_field.exists(connection, &fk_id)? {
            self.existing.borrow_mut().insert((fk_field, fk_id.clone()));
            return Ok(fk_id);
        }

        let message = format!(
            "Sync translation: required foreign key not found, the referenced record must be integrated first. \
             table={record_table}, record_id={record_id}, fk_field={fk_field_name}, fk_id={fk_id}"
        );
        self.record_missing_fk(connection, &message)?;
        Err(anyhow::anyhow!(message))
    }

    /// Log an FK-not-found error and record a `system_log` row. The `system_log` insert is a
    /// successful statement, so it is not rolled back by a later logical `Err` returned from the
    /// translator (which a DB foreign-key violation, by contrast, would abort).
    fn record_missing_fk(
        &self,
        connection: &StorageConnection,
        message: &str,
    ) -> Result<(), RepositoryError> {
        log::error!("{message}");
        SystemLogRowRepository::new(connection).insert_one(&SystemLogRow {
            id: uuid(),
            r#type: SystemLogType::SyncTranslationFkError,
            sync_site_id: None,
            datetime: Utc::now().naive_utc(),
            message: Some(message.to_string()),
            is_error: true,
        })?;
        Ok(())
    }
}

pub(crate) fn clear_invalid_location_id(
    connection: &StorageConnection,
    location_id: Option<String>,
) -> Result<Option<String>, RepositoryError> {
    let location_id = if let Some(id) = location_id {
        LocationRowRepository::new(connection)
            .find_one_by_id(&id)?
            .map(|it| it.id)
    } else {
        None
    };
    Ok(location_id)
}

/// A pair of JSON key names for a single field that was renamed in Rust but whose former
/// name must stay on the sync wire for cross-version compatibility:
///  - `.0` = the canonical key: the field's current Rust name (e.g. `name_id`), which serde
///    emits and expects natively.
///  - `.1` = the legacy alias key: the field's former wire name (e.g. `name_link_id`).
///
/// The motivating case is the name_link / entity-link abstraction (PR #10181), which renamed
/// the foreign-key fields from `*_link_id` to `*_id`. Remotes <= v2.16 speak only the legacy
/// `*_link_id`; the v2.17 - v2.19 window speaks only the bare `*_id` (where the Rust rename
/// leaked onto the wire); v2.20+ remotes - speak both. Because no released remote ever set `SYNC_V6_VERSION` differently for these formats,
/// central can't tell which name a given remote understands, so the helpers below let it emit
/// both at once.
pub(crate) type RenamedKeys = &'static [(&'static str, &'static str)];

/// Outgoing (central -> remote on pull, and remote -> central on push): serialise `row` under
/// its canonical field names, then duplicate each canonical value under its legacy alias key
/// so a remote that still expects the old name finds it. The extra key is an ignored unknown
/// field for remotes that don't use it, so emitting both is always safe.
pub(crate) fn to_renamed_keys_value<T: serde::Serialize>(
    row: &T,
    keys: RenamedKeys,
) -> Result<serde_json::Value, serde_json::Error> {
    let mut value = serde_json::to_value(row)?;
    if let Some(object) = value.as_object_mut() {
        for (canonical_key, alias_key) in keys {
            if let Some(canonical_value) = object.get(*canonical_key).cloned() {
                object.insert((*alias_key).to_string(), canonical_value);
            }
        }
    }
    Ok(value)
}

/// Incoming (parse before deserialise): fold each legacy alias key onto the canonical key that
/// the row struct expects. This accepts records that carry only the old alias name and strips
/// the redundant alias from records that carry both names.
///
/// When a record carries *both* names they must agree: central emits the two keys with the
/// same value, so disagreement means a malformed or tampered record where we can't tell which
/// value was intended. Rather than silently pick one, this errors out.
pub(crate) fn from_renamed_keys_str<T: serde::de::DeserializeOwned>(
    data: &str,
    keys: RenamedKeys,
) -> Result<T, serde_json::Error> {
    use serde::de::Error as _;

    let mut value: serde_json::Value = serde_json::from_str(data)?;
    if let Some(object) = value.as_object_mut() {
        for (canonical_key, alias_key) in keys {
            if let Some(alias_value) = object.remove(*alias_key) {
                if let Some(canonical_value) = object.get(*canonical_key) {
                    // Both names present: they must agree, otherwise we can't tell which value
                    // the record meant. (Equal values just drop the redundant alias.)
                    if *canonical_value != alias_value {
                        return Err(serde_json::Error::custom(format!(
                            "sync record carries conflicting values for `{canonical_key}` \
                             ({canonical_value}) and `{alias_key}` ({alias_value})"
                        )));
                    }
                } else {
                    // Only the legacy alias present: promote it to the canonical key.
                    object.insert((*canonical_key).to_string(), alias_value);
                }
            }
        }
    }
    serde_json::from_value(value)
}

#[cfg(test)]
mod renamed_keys_tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use serde_json::json;

    // `.0` canonical (current Rust name), `.1` legacy alias.
    const KEYS: RenamedKeys = &[("name_id", "name_link_id")];

    #[derive(Serialize, Deserialize, Debug, PartialEq, Default)]
    struct Row {
        id: String,
        name_id: String,
    }

    #[test]
    fn emits_both_canonical_and_alias_keys() {
        let row = Row {
            id: "r1".to_string(),
            name_id: "n1".to_string(),
        };
        let value = to_renamed_keys_value(&row, KEYS).unwrap();
        assert_eq!(value["name_id"], "n1");
        assert_eq!(value["name_link_id"], "n1");
    }

    #[test]
    fn accepts_canonical_only() {
        // A v2.17 - v2.19 remote sends only the canonical `name_id`.
        let row: Row =
            from_renamed_keys_str(&json!({"id": "r1", "name_id": "n1"}).to_string(), KEYS).unwrap();
        assert_eq!(row.name_id, "n1");
    }

    #[test]
    fn accepts_legacy_alias_only() {
        // A <= v2.16 remote sends only the legacy `name_link_id`; promote it.
        let row: Row =
            from_renamed_keys_str(&json!({"id": "r1", "name_link_id": "n1"}).to_string(), KEYS)
                .unwrap();
        assert_eq!(row.name_id, "n1");
    }

    #[test]
    fn accepts_both_matching() {
        // Central emits both; a same-version remote/central must read it back.
        let row: Row = from_renamed_keys_str(
            &json!({"id": "r1", "name_id": "n1", "name_link_id": "n1"}).to_string(),
            KEYS,
        )
        .unwrap();
        assert_eq!(row.name_id, "n1");
    }

    #[test]
    fn rejects_conflicting_values() {
        // Both names present but disagreeing — we can't tell which value was intended.
        let result: Result<Row, _> = from_renamed_keys_str(
            &json!({"id": "r1", "name_id": "n1", "name_link_id": "n2"}).to_string(),
            KEYS,
        );
        assert!(result.is_err());
    }

    #[test]
    fn round_trips_through_the_wire() {
        let row = Row {
            id: "r1".to_string(),
            name_id: "n1".to_string(),
        };
        let wire = to_renamed_keys_value(&row, KEYS).unwrap();
        let parsed: Row = from_renamed_keys_str(&wire.to_string(), KEYS).unwrap();
        assert_eq!(row, parsed);
    }
}
