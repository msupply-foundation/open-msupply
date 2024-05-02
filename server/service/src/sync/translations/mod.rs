// pub(crate) mod activity_log;
// pub(crate) mod asset;
// pub(crate) mod asset_catalogue_item;
// pub(crate) mod asset_catalogue_item_property;
// pub(crate) mod asset_catalogue_property;
// pub(crate) mod asset_category;
// pub(crate) mod asset_class;
// pub(crate) mod asset_log;
// pub(crate) mod asset_log_reason;
// pub(crate) mod asset_type;
// pub(crate) mod barcode;
// pub(crate) mod clinician;
// pub(crate) mod clinician_store_join;
// pub(crate) mod currency;
// pub(crate) mod document;
// pub(crate) mod document_registry;
// pub(crate) mod form_schema;
// pub(crate) mod invoice;
// pub(crate) mod invoice_line;
// pub(crate) mod item;
// pub(crate) mod location;
// pub(crate) mod location_movement;
// pub(crate) mod master_list;
// pub(crate) mod master_list_line;
// pub(crate) mod master_list_name_join;
// pub(crate) mod name;
// pub(crate) mod name_store_join;
// pub(crate) mod name_tag;
// pub(crate) mod name_tag_join;
// pub(crate) mod pack_variant;
// pub(crate) mod period;
// pub(crate) mod period_schedule;
// pub(crate) mod program_requisition_settings;
// pub(crate) mod reason;
// pub(crate) mod report;
// pub(crate) mod requisition;
// pub(crate) mod requisition_line;
// pub(crate) mod sensor;
// pub(crate) mod special;
// pub(crate) mod stock_line;
// pub(crate) mod stocktake;
// pub(crate) mod stocktake_line;
// pub(crate) mod store;
// pub(crate) mod store_preference;
// // pub(crate) mod sync_file_reference;
// pub(crate) mod temperature_breach;
// pub(crate) mod temperature_log;
// pub(crate) mod unit;
// pub(crate) mod user;
// pub(crate) mod user_permission;
// pub(crate) mod utils;

use repository::{
    ChangeLogSyncStyle, ChangelogAction, ChangelogRow, ChangelogTableName, Delete, EqualFilter,
    InvoiceFilter, InvoiceRepository, KeyValueStoreRepository, RepositoryError, StorageConnection,
    SyncBufferRow, Upsert,
};
use thiserror::Error;
use topological_sort::TopologicalSort;

use super::api::{CommonSyncRecord, SyncAction};

pub(crate) type SyncTranslators = Vec<Box<dyn SyncTranslation>>;

macro_rules! create_translator {
    ($translator:ident, $table_name:expr, $change_log:path, $row_type:ident, $repo_type:ident, $deps:expr) => {
        struct $translator;
        impl SyncTranslation for $translator {
            fn table_name(&self) -> &str {
                $table_name
            }

            fn pull_dependencies(&self) -> Vec<&str> {
                $deps
            }

            fn change_log_type(&self) -> Option<ChangelogTableName> {
                Some($change_log)
            }

            // This should really be FindOneById trait, similar to Upsert trait
            fn try_translate_to_upsert_sync_record(
                &self,
                connection: &StorageConnection,
                changelog: &ChangelogRow,
            ) -> Result<PushTranslateResult, anyhow::Error> {
                let row = $repo_type::new(connection)
                    .find_one_by_id(&changelog.record_id)?
                    .ok_or(anyhow::Error::msg(format!(
                        "{} ({}) not found",
                        $table_name, changelog.record_id
                    )))?;

                Ok(PushTranslateResult::upsert(
                    changelog,
                    $table_name,
                    serde_json::to_value(&row)?,
                ))
            }

            fn try_translate_from_upsert_sync_record(
                &self,
                _: &StorageConnection,
                sync_record: &SyncBufferRow,
            ) -> Result<PullTranslateResult, anyhow::Error> {
                Ok(PullTranslateResult::upsert(serde_json::from_str::<
                    $row_type,
                >(&sync_record.data)?))
            }

            fn should_translate_to_sync_record(
                &self,
                row: &ChangelogRow,
                r#type: &ToSyncRecordTranslationType,
            ) -> bool {
                let Some(change_log_table_name) = &self.change_log_type() else {
                    return false;
                };

                if change_log_table_name != &row.table_name {
                    return false;
                }

                match r#type {
                    ToSyncRecordTranslationType::PullFromOmSupplyCentral => true,
                    ToSyncRecordTranslationType::PushToOmSupplyCentral => {
                        change_log_table_name.sync_style() == ChangeLogSyncStyle::Remote
                    }
                    _ => false,
                }
            }
        }

        impl $translator {
            fn boxed() -> Box<dyn SyncTranslation> {
                Box::new(Self)
            }
        }
    };
}

use repository::asset_class_row::*;
create_translator!(
    AssetClassTranslation,
    "asset_calss",
    ChangelogTableName::AssetClass,
    AssetClassRow,
    AssetClassRowRepository,
    vec![]
);

use repository::asset_category_row::*;
create_translator!(
    AssetCategoryTranslation,
    "asset_category",
    ChangelogTableName::AssetCategory,
    AssetCategoryRow,
    AssetCategoryRowRepository,
    vec![AssetClassTranslation.table_name()]
);

use repository::asset_row::*;
create_translator!(
    AssetTranslation,
    "asset",
    ChangelogTableName::Asset,
    AssetRow,
    AssetRowRepository,
    vec![AssetCategoryTranslation.table_name()]
);

use repository::asset_type_row::*;
create_translator!(
    AssetTypeTranslation,
    "asset_catalogue_type",
    ChangelogTableName::AssetCatalogueType,
    AssetTypeRow,
    AssetTypeRowRepository,
    vec![AssetCategoryTranslation.table_name()]
);

use repository::asset_catalogue_item_row::*;
create_translator!(
    AssetCatalogueItemTranslation,
    "asset_catalogue_item",
    ChangelogTableName::AssetCatalogueItem,
    AssetCatalogueItemRow,
    AssetCatalogueItemRowRepository,
    vec![
        AssetCategoryTranslation.table_name(),
        AssetTypeTranslation.table_name(),
        AssetClassTranslation.table_name(),
    ]
);

use repository::asset_catalogue_item_property_row::*;
create_translator!(
    AssetCatalogueItemPropertyTranslation,
    "asset_catalogue_item_property",
    ChangelogTableName::AssetCatalogueItemProperty,
    AssetCatalogueItemPropertyRow,
    AssetCatalogueItemPropertyRowRepository,
    vec![
        AssetClassTranslation.table_name(),
        AssetCategoryTranslation.table_name(),
        AssetTypeTranslation.table_name(),
    ]
);

use repository::asset_catalogue_property_row::*;
create_translator!(
    AssetCataloguePropertyTranslation,
    "asset_catalogue_property",
    ChangelogTableName::AssetCatalogueProperty,
    AssetCataloguePropertyRow,
    AssetCataloguePropertyRowRepository,
    vec![
        AssetClassTranslation.table_name(),
        AssetCategoryTranslation.table_name(),
        AssetTypeTranslation.table_name(),
    ]
);

use repository::asset_log_reason_row::*;
create_translator!(
    AssetLogReasonTranslation,
    "asset_log_reason",
    ChangelogTableName::AssetLogReason,
    AssetLogReasonRow,
    AssetLogReasonRowRepository,
    vec![]
);

use repository::asset_log_row::*;
create_translator!(
    AssetLogTranslation,
    "asset_log",
    ChangelogTableName::AssetLog,
    AssetLogRow,
    AssetLogRowRepository,
    vec![
        AssetTranslation.table_name(),
        AssetLogReasonTranslation.table_name(),
    ]
);

use repository::sync_file_reference_row::*;
create_translator!(
    SyncFileReferenceTranslation,
    "sync_file_reference",
    ChangelogTableName::SyncFileReference,
    SyncFileReferenceRow,
    SyncFileReferenceRowRepository,
    vec![AssetTranslation.table_name()]
);

use repository::*;
create_translator!(
    UserTranslation,
    "user",
    ChangelogTableName::User,
    UserAccountRow,
    UserAccountRowRepository,
    vec![]
);

create_translator!(
    NameTranslation,
    "name",
    ChangelogTableName::Name,
    NameRow,
    NameRowRepository,
    vec![]
);

create_translator!(
    NameTagTranslation,
    "name_tag",
    ChangelogTableName::NameTag,
    NameTagRow,
    NameTagRowRepository,
    vec![]
);

create_translator!(
    NameTagJoinTranslation,
    "name_tag_join",
    ChangelogTableName::NameTagJoin,
    NameTagJoinRow,
    NameTagJoinRepository,
    vec![]
);

create_translator!(
    UnitTranslation,
    "unit",
    ChangelogTableName::Unit,
    UnitRow,
    UnitRowRepository,
    vec![]
);

create_translator!(
    ItemTranslation,
    "Item",
    ChangelogTableName::Item,
    ItemRow,
    ItemRowRepository,
    vec![]
);

create_translator!(
    StoreTranslation,
    "Store",
    ChangelogTableName::Store,
    StoreRow,
    StoreRowRepository,
    vec![]
);

create_translator!(
    MasterListTranslation,
    "MasterList",
    ChangelogTableName::MasterList,
    MasterListRow,
    MasterListRowRepository,
    vec![]
);

create_translator!(
    MasterListLineTranslation,
    "MasterListLine",
    ChangelogTableName::MasterListLine,
    MasterListLineRow,
    MasterListLineRowRepository,
    vec![]
);

create_translator!(
    MasterListNameJoinTranslation,
    "MasterListNameJoin",
    ChangelogTableName::MasterListNameJoin,
    MasterListNameJoinRow,
    MasterListNameJoinRepository,
    vec![]
);

create_translator!(
    LocationTranslation,
    "Location",
    ChangelogTableName::Location,
    LocationRow,
    LocationRowRepository,
    vec![]
);

create_translator!(
    LocationMovementTranslation,
    "LocationMovement",
    ChangelogTableName::LocationMovement,
    LocationMovementRow,
    LocationMovementRowRepository,
    vec![]
);

create_translator!(
    StockLineTranslation,
    "StockLine",
    ChangelogTableName::StockLine,
    StockLineRow,
    StockLineRowRepository,
    vec![]
);

create_translator!(
    InvoiceTranslation,
    "Invoice",
    ChangelogTableName::Invoice,
    InvoiceRow,
    InvoiceRowRepository,
    vec![]
);

create_translator!(
    InvoiceLineTranslation,
    "InvoiceLine",
    ChangelogTableName::InvoiceLine,
    InvoiceLineRow,
    InvoiceLineRowRepository,
    vec![]
);

create_translator!(
    StocktakeTranslation,
    "Stocktake",
    ChangelogTableName::Stocktake,
    StocktakeRow,
    StocktakeRowRepository,
    vec![]
);

create_translator!(
    StocktakeLineTranslation,
    "StocktakeLine",
    ChangelogTableName::StocktakeLine,
    StocktakeLineRow,
    StocktakeLineRowRepository,
    vec![]
);

create_translator!(
    RequisitionTranslation,
    "Requisition",
    ChangelogTableName::Requisition,
    RequisitionRow,
    RequisitionRowRepository,
    vec![]
);

create_translator!(
    RequisitionLineTranslation,
    "RequisitionLine",
    ChangelogTableName::RequisitionLine,
    RequisitionLineRow,
    RequisitionLineRowRepository,
    vec![]
);

create_translator!(
    ActivityLogTranslation,
    "ActivityLog",
    ChangelogTableName::ActivityLog,
    ActivityLogRow,
    ActivityLogRowRepository,
    vec![]
);

create_translator!(
    NameStoreJoinTranslation,
    "NameStoreJoin",
    ChangelogTableName::NameStoreJoin,
    NameStoreJoinRow,
    NameStoreJoinRepository,
    vec![]
);

create_translator!(
    UserPermissionTranslation,
    "UserPermission",
    ChangelogTableName::UserPermission,
    UserPermissionRow,
    UserPermissionRowRepository,
    vec![]
);

pub(crate) fn all_translators() -> SyncTranslators {
    vec![
        // Central
        UserTranslation::boxed(),
        NameTranslation::boxed(),
        NameTagTranslation::boxed(),
        NameTagJoinTranslation::boxed(),
        UnitTranslation::boxed(),
        ItemTranslation::boxed(),
        StoreTranslation::boxed(),
        MasterListTranslation::boxed(),
        MasterListLineTranslation::boxed(),
        MasterListNameJoinTranslation::boxed(),
        // period_schedule::boxed(),
        // period::boxed(),
        // program_requisition_settings::boxed(),
        // report::boxed(),
        // reason::boxed(),
        // store_preference::boxed(),
        // form_schema::boxed(),
        // document_registry::boxed(),
        // Remote
        LocationTranslation::boxed(),
        LocationMovementTranslation::boxed(),
        StockLineTranslation::boxed(),
        InvoiceTranslation::boxed(),
        InvoiceLineTranslation::boxed(),
        StocktakeTranslation::boxed(),
        StocktakeLineTranslation::boxed(),
        RequisitionTranslation::boxed(),
        RequisitionLineTranslation::boxed(),
        ActivityLogTranslation::boxed(),
        // barcode::boxed(),
        // clinician::boxed(),
        // clinician_store_join::boxed(),
        NameStoreJoinTranslation::boxed(),
        UserPermissionTranslation::boxed(),
        // document::boxed(),
        // currency::boxed(),
        // // Cold chain
        // sensor::boxed(),
        // temperature_breach::boxed(),
        // temperature_log::boxed(),
        // pack_variant::boxed(),
        // // Special translations
        // special::name_to_name_store_join::boxed(),
        // // Merge
        // special::name_merge::boxed(),
        // special::item_merge::boxed(),
        // special::clinician_merge::boxed(),
        // Assets
        AssetTranslation::boxed(),
        AssetClassTranslation::boxed(),
        AssetCategoryTranslation::boxed(),
        AssetTypeTranslation::boxed(),
        AssetCatalogueItemTranslation::boxed(),
        AssetCatalogueItemPropertyTranslation::boxed(),
        AssetCataloguePropertyTranslation::boxed(),
        AssetLogTranslation::boxed(),
        AssetLogReasonTranslation::boxed(),
        //Sync file reference
        SyncFileReferenceTranslation::boxed(),
    ]
}

// pub(crate) trait SyncTranslationV6 {
//     type Output: DeserializeOwned
//         + Upsert
//         + 'static
//         // + FindOneById<Output = Self::Output>
//         + Serialize;

//     fn pull_dependencies(&self) -> Vec<&str>;

//     fn change_log_type(&self) -> Option<ChangelogTableName>;

//     fn table_name(&self) -> &str;

//     fn try_translate_to_upsert_sync_record(
//         &self,
//         connection: &StorageConnection,
//         changelog: &ChangelogRow,
//     ) -> Result<PushTranslateResult, anyhow::Error>;
// }

// impl<T> SyncTranslation for T
// where
//     T: SyncTranslationV6,
// {
//     fn pull_dependencies(&self) -> Vec<&str> {
//         T::pull_dependencies(&self)
//     }

//     fn table_name(&self) -> &str {
//         T::table_name(&self)
//     }

//     fn change_log_type(&self) -> Option<ChangelogTableName> {
//         T::change_log_type(&self)
//     }

//     fn try_translate_from_upsert_sync_record(
//         &self,
//         _: &StorageConnection,
//         sync_record: &SyncBufferRow,
//     ) -> Result<PullTranslateResult, anyhow::Error> {
//         Ok(PullTranslateResult::upsert(serde_json::from_str::<
//             T::Output,
//         >(&sync_record.data)?))
//     }

//     fn try_translate_to_upsert_sync_record(
//         &self,
//         connection: &StorageConnection,
//         changelog: &ChangelogRow,
//     ) -> Result<PushTranslateResult, anyhow::Error> {
//         T::try_translate_to_upsert_sync_record(&self, connection, changelog)
//     }

//     fn should_translate_to_sync_record(
//         &self,
//         row: &ChangelogRow,
//         r#type: &ToSyncRecordTranslationType,
//     ) -> bool {
//         let Some(change_log_table_name) = &self.change_log_type() else {
//             return false;
//         };

//         if change_log_table_name != &row.table_name {
//             return false;
//         }

//         match r#type {
//             ToSyncRecordTranslationType::PullFromOmSupplyCentral => true,
//             ToSyncRecordTranslationType::PushToOmSupplyCentral => {
//                 change_log_table_name.sync_style() == ChangeLogSyncStyle::Remote
//             }
//             _ => false,
//         }
//     }
// }
// impl SyncTranslationV6 for AssetClassTranslation {
//     type Output = AssetClassRow;

//     fn pull_dependencies(&self) -> Vec<&str> {
//         vec![]
//     }

//     fn change_log_type(&self) -> Option<ChangelogTableName> {
//         Some(ChangelogTableName::AssetClass)
//     }

//     fn try_translate_to_upsert_sync_record(
//         &self,
//         connection: &StorageConnection,
//         changelog: &ChangelogRow,
//     ) -> Result<PushTranslateResult, anyhow::Error> {
//         let row = AssetClassRowRepository::new(connection)
//             .find_one_by_id(&changelog.record_id)?
//             .ok_or(anyhow::Error::msg(format!(
//                 "Asset row ({}) not found",
//                 changelog.record_id
//             )))?;

//         Ok(PushTranslateResult::upsert(
//             changelog,
//             self.table_name(),
//             serde_json::to_value(&row)?,
//         ))
//     }
// }

/// Calculates the integration order based on the PullDependencies in the SyncTranslators
pub(crate) fn pull_integration_order(translators: &SyncTranslators) -> Vec<&str> {
    // fill output so that tables with the least dependencies come first
    let mut output = vec![];

    let mut ts = TopologicalSort::<&str>::new();
    for translator in translators {
        let pull_deps = translator.pull_dependencies();
        let table = translator.table_name();
        if pull_deps.is_empty() {
            ts.insert(table);
            continue;
        }
        for dep in pull_deps {
            ts.add_dependency(dep, table);
        }
    }

    loop {
        let mut next = ts.pop_all();
        if next.is_empty() {
            if !ts.is_empty() {
                panic!("Circular dependencies");
            }
            break;
        }
        output.append(&mut next);
    }

    output
}

#[derive(Debug)]
pub(crate) enum IntegrationOperation {
    Upsert(Box<dyn Upsert>, Option<i32>), // Upsert record, and source_site_id
    Delete(Box<dyn Delete>),              // Todo: add source site id?
}

impl IntegrationOperation {
    pub(crate) fn upsert<U>(upsert: U) -> Self
    where
        U: Upsert + 'static,
    {
        Self::Upsert(Box::new(upsert), None) // TODO?
    }

    pub(crate) fn delete<U>(delete: U) -> Self
    where
        U: Delete + 'static,
    {
        Self::Delete(Box::new(delete))
    }
}

#[derive(Debug)]
pub(crate) enum PullTranslateResult {
    IntegrationOperations(Vec<IntegrationOperation>),
    // Translator was found for a record, but ignored because of unexpected data or error
    // For example if store is a system store, or report context not found
    Ignored(String),
    // Translator doesn't translates this record
    NotMatched,
}

impl PartialEq for PullTranslateResult {
    fn eq(&self, other: &Self) -> bool {
        format!("{self:?}") == format!("{other:?}")
    }
}

impl PullTranslateResult {
    pub(crate) fn upsert<U>(upsert: U) -> Self
    where
        U: Upsert + 'static,
    {
        Self::upserts(vec![upsert])
    }

    pub(crate) fn upserts<U>(upsert: Vec<U>) -> Self
    where
        U: Upsert + 'static,
    {
        Self::IntegrationOperations(
            upsert
                .into_iter()
                .map(|upsert| IntegrationOperation::Upsert(Box::new(upsert), None)) // Source site is added later using add_source_site_id
                .collect(),
        )
    }

    pub(crate) fn add_source_site_id(&mut self, source_site_id: i32) {
        match self {
            Self::IntegrationOperations(operations) => {
                for operation in operations {
                    if let IntegrationOperation::Upsert(_, ref mut site_id) = operation {
                        *site_id = Some(source_site_id);
                    }
                }
            }
            _ => {}
        }
    }

    pub(crate) fn delete<U>(upsert: U) -> Self
    where
        U: Delete + 'static,
    {
        Self::deletes(vec![upsert])
    }

    pub(crate) fn deletes<U>(upsert: Vec<U>) -> Self
    where
        U: Delete + 'static,
    {
        Self::IntegrationOperations(
            upsert
                .into_iter()
                .map(|upsert| IntegrationOperation::Delete(Box::new(upsert)))
                .collect(),
        )
    }
}

pub(crate) struct PushSyncRecord {
    pub(crate) cursor: i64,
    pub(crate) record: CommonSyncRecord,
}

pub(crate) enum PushTranslateResult {
    PushRecord(Vec<PushSyncRecord>),
    Ignored(String),
    NotMatched,
}

impl PushTranslateResult {
    pub(crate) fn upsert(
        changelog: &ChangelogRow,
        table_name: &str,
        record_data: serde_json::Value,
    ) -> Self {
        Self::PushRecord(vec![PushSyncRecord {
            cursor: changelog.cursor,
            record: CommonSyncRecord {
                table_name: table_name.to_string(),
                record_id: changelog.record_id.clone(),
                action: SyncAction::Update,
                record_data,
            },
        }])
    }
    pub(crate) fn delete(changelog: &ChangelogRow, table_name: &str) -> Self {
        Self::PushRecord(vec![PushSyncRecord {
            cursor: changelog.cursor,
            record: CommonSyncRecord {
                table_name: table_name.to_string(),
                record_id: changelog.record_id.clone(),
                action: SyncAction::Delete,
                record_data: Default::default(),
            },
        }])
    }
}

/// This enum is used in match_to_sync_record to determine
/// if record needs to be translated and pushed or pulled
/// since SyncTranslation is used for translating from database row
/// to sync record when pushing remote records to Legacy Centra, omSupply Central
/// and when omSupply central is preparing records in response to a pull requestion
/// from omSupply remote sites
pub(crate) enum ToSyncRecordTranslationType {
    /// When omSupply remote is pushing to og mSupply central
    PushToLegacyCentral,
    /// When omSupply remote is pushing to omSupply central
    PushToOmSupplyCentral,
    // When omSupply remote is pulling from omSupply central
    PullFromOmSupplyCentral,
}

/// This trait has collection of methods for sync operation translations
/// it is used on remote site when translating records:
///  * pulled from legacy and omSupply central servers
///  * pushed to legacy and omSupply central servers
/// also used on central site when responding to pull requests
/// from remote sites, to translate to sync record sent in response
///
/// "sync_record" in this context refers to transport layer records (json representation of database record alongside metadata like table_name)
pub(crate) trait SyncTranslation {
    /// Returns information about which legacy tables need to be integrated first before this
    /// translation can run.
    fn pull_dependencies(&self) -> Vec<&str>;
    fn table_name(&self) -> &str;
    /// By default matching by table name
    /// used to determine if translation applies when remote site pulls sync records from central
    fn should_translate_from_sync_record(&self, row: &SyncBufferRow) -> bool {
        self.table_name() == row.table_name
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    fn try_translate_from_merge_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        _: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::NotMatched)
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        None
    }

    /// By default matching by change log type, this methods also determines
    /// if records needs to be pushed to legacy or omSupply central and which records
    /// omSupply central should respond with when pull is requested by remote site
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            // By default will assume records needs to be pushed to central if change_log_type is implemented
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            // Have to manually specify in the translation
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => false,
            // Have to manually specify in the translation
            ToSyncRecordTranslationType::PushToOmSupplyCentral => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::NotMatched)
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        _: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::NotMatched)
    }
}
#[derive(Error, Debug)]
#[error("Problem translation push record: {changelog:?}")]
pub(crate) struct PushTranslationError {
    changelog: ChangelogRow,
    source: anyhow::Error,
}

pub(crate) fn translate_changelogs_to_sync_records(
    connection: &StorageConnection,
    changelogs: Vec<ChangelogRow>,
    r#type: ToSyncRecordTranslationType,
) -> Result<Vec<PushSyncRecord>, PushTranslationError> {
    let translators = all_translators();
    let mut out_records = Vec::new();
    for changelog in changelogs {
        let mut translation_results =
            translate_changelog(connection, &translators, &changelog, &r#type)
                .map_err(|source| PushTranslationError { source, changelog })?;
        out_records.append(&mut translation_results);
    }

    Ok(out_records)
}

fn translate_changelog(
    connection: &StorageConnection,
    translators: &SyncTranslators,
    changelog: &ChangelogRow,
    r#type: &ToSyncRecordTranslationType,
) -> Result<Vec<PushSyncRecord>, anyhow::Error> {
    let mut translation_results = Vec::new();

    for translator in translators.iter() {
        if !translator.should_translate_to_sync_record(changelog, r#type) {
            continue;
        }

        let translation_result = match changelog.row_action {
            ChangelogAction::Upsert => {
                translator.try_translate_to_upsert_sync_record(connection, changelog)?
            }
            ChangelogAction::Delete => {
                translator.try_translate_to_delete_sync_record(connection, changelog)?
            }
        };

        match translation_result {
            PushTranslateResult::PushRecord(records) => translation_results.push(records),
            PushTranslateResult::Ignored(ignore_message) => {
                log::debug!("Ignored record in push translation: {}", ignore_message)
            }
            PushTranslateResult::NotMatched => {}
        }
    }

    Ok(translation_results.into_iter().flatten().collect())
}

#[derive(Debug)]
enum ActiveRecordCheck {
    InvoiceLine { invoice_id: String },
}

#[derive(Error, Debug)]
enum ActiveRecordCheckError {
    #[error("Database error while checking record is active on site {0:?}")]
    DatabaseError(RepositoryError),
    #[error("Problem checking record is active on site, site id is not set in database")]
    SiteIdNotSet,
    #[error("Problem checking record is active on site, parent record not found for {0:?}")]
    ParentRecordNotFound(ActiveRecordCheck),
}

fn is_active_record_on_site(
    connection: &StorageConnection,
    record: ActiveRecordCheck,
) -> Result<bool, ActiveRecordCheckError> {
    use ActiveRecordCheckError as Error;
    let site_id = KeyValueStoreRepository::new(connection)
        .get_i32(repository::KeyValueType::SettingsSyncSiteId)
        .map_err(Error::DatabaseError)?
        .ok_or(Error::SiteIdNotSet)?;

    let result = match &record {
        ActiveRecordCheck::InvoiceLine { invoice_id } => {
            let invoice = InvoiceRepository::new(connection)
                .query_one(InvoiceFilter::new().id(EqualFilter::equal_to(&invoice_id)))
                .map_err(Error::DatabaseError)?
                .ok_or_else(|| Error::ParentRecordNotFound(record))?;
            invoice.store_row.site_id == site_id
        }
    };

    Ok(result)
}
