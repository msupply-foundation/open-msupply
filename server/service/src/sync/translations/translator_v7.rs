use super::*;
use repository::changelog::*;
use repository::*;

macro_rules! create_v7_translator {
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
                    ToSyncRecordTranslationType::PullFromOmSupplyCentralV7 => true,
                    ToSyncRecordTranslationType::PushToOmSupplyCentralV7 => {
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

use super::SyncTranslators;
create_v7_translator!(
    AssetClassTranslation,
    "v7_asset_class",
    ChangelogTableName::AssetClass,
    AssetClassRow,
    AssetClassRowRepository,
    vec![]
);

use repository::asset_category_row::*;
create_v7_translator!(
    AssetCategoryTranslation,
    "v7_asset_category",
    ChangelogTableName::AssetCategory,
    AssetCategoryRow,
    AssetCategoryRowRepository,
    vec![AssetClassTranslation.table_name()]
);

use repository::asset_row::*;
create_v7_translator!(
    AssetTranslation,
    "v7_asset",
    ChangelogTableName::Asset,
    AssetRow,
    AssetRowRepository,
    vec![AssetCategoryTranslation.table_name()]
);

use repository::asset_type_row::*;
create_v7_translator!(
    AssetTypeTranslation,
    "v7_asset_catalogue_type",
    ChangelogTableName::AssetCatalogueType,
    AssetTypeRow,
    AssetTypeRowRepository,
    vec![AssetCategoryTranslation.table_name()]
);

use repository::asset_catalogue_item_row::*;
create_v7_translator!(
    AssetCatalogueItemTranslation,
    "v7_asset_catalogue_item",
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
create_v7_translator!(
    AssetCatalogueItemPropertyTranslation,
    "v7_asset_catalogue_item_property",
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
create_v7_translator!(
    AssetCataloguePropertyTranslation,
    "v7_asset_catalogue_property",
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
create_v7_translator!(
    AssetLogReasonTranslation,
    "v7_asset_log_reason",
    ChangelogTableName::AssetLogReason,
    AssetLogReasonRow,
    AssetLogReasonRowRepository,
    vec![]
);

use repository::asset_log_row::*;
create_v7_translator!(
    AssetLogTranslation,
    "v7_asset_log",
    ChangelogTableName::AssetLog,
    AssetLogRow,
    AssetLogRowRepository,
    vec![
        AssetTranslation.table_name(),
        AssetLogReasonTranslation.table_name(),
    ]
);

create_v7_translator!(
    SyncFileReferenceTranslation,
    "v7_sync_file_reference",
    ChangelogTableName::SyncFileReference,
    SyncFileReferenceRow,
    SyncFileReferenceRowRepository,
    vec![AssetTranslation.table_name()]
);

create_v7_translator!(
    UserTranslation,
    "v7_user",
    ChangelogTableName::User,
    UserAccountRow,
    UserAccountRowRepository,
    vec![]
);

create_v7_translator!(
    UserPermissionTranslation,
    "v7_user_permission",
    ChangelogTableName::UserPermission,
    UserPermissionRow,
    UserPermissionRowRepository,
    vec![UserTranslation.table_name(), StoreTranslation.table_name()]
);

create_v7_translator!(
    UserStoreJoinTranslation,
    "v7_user_store_join",
    ChangelogTableName::UserStoreJoin,
    UserStoreJoinRow,
    UserStoreJoinRowRepository,
    vec![UserTranslation.table_name(), StoreTranslation.table_name()]
);

create_v7_translator!(
    NameTranslation,
    "v7_name",
    ChangelogTableName::Name,
    NameRow,
    NameRowRepository,
    vec![]
);

// TODO skipping for now
create_v7_translator!(
    NameTagTranslation,
    "v7_name_tag",
    ChangelogTableName::NameTag,
    NameTagRow,
    NameTagRowRepository,
    vec![]
);

// TODO skipping for now
create_v7_translator!(
    NameTagJoinTranslation,
    "v7_name_tag_join",
    ChangelogTableName::NameTagJoin,
    NameTagJoinRow,
    NameTagJoinRepository,
    vec![]
);

create_v7_translator!(
    UnitTranslation,
    "v7_unit",
    ChangelogTableName::Unit,
    UnitRow,
    UnitRowRepository,
    vec![]
);

create_v7_translator!(
    ItemTranslation,
    "v7_Item",
    ChangelogTableName::Item,
    ItemRow,
    ItemRowRepository,
    vec![UnitTranslation.table_name()]
);

create_v7_translator!(
    StoreTranslation,
    "v7_Store",
    ChangelogTableName::Store,
    StoreRow,
    StoreRowRepository,
    vec![NameTranslation.table_name()]
);

create_v7_translator!(
    MasterListTranslation,
    "v7_MasterList",
    ChangelogTableName::MasterList,
    MasterListRow,
    MasterListRowRepository,
    vec![]
);

create_v7_translator!(
    MasterListLineTranslation,
    "v7_MasterListLine",
    ChangelogTableName::MasterListLine,
    MasterListLineRow,
    MasterListLineRowRepository,
    vec![
        MasterListTranslation.table_name(),
        ItemTranslation.table_name()
    ]
);

create_v7_translator!(
    MasterListNameJoinTranslation,
    "v7_MasterListNameJoin",
    ChangelogTableName::MasterListNameJoin,
    MasterListNameJoinRow,
    MasterListNameJoinRepository,
    vec![
        NameTranslation.table_name(),
        MasterListTranslation.table_name(),
    ]
);

create_v7_translator!(
    LocationTranslation,
    "v7_Location",
    ChangelogTableName::Location,
    LocationRow,
    LocationRowRepository,
    vec![StoreTranslation.table_name()]
);

create_v7_translator!(
    StockLineTranslation,
    "v7_StockLine",
    ChangelogTableName::StockLine,
    StockLineRow,
    StockLineRowRepository,
    vec![
        ItemTranslation.table_name(),
        NameTranslation.table_name(),
        StoreTranslation.table_name(),
        LocationTranslation.table_name()
    ]
);

create_v7_translator!(
    LocationMovementTranslation,
    "v7_LocationMovement",
    ChangelogTableName::LocationMovement,
    LocationMovementRow,
    LocationMovementRowRepository,
    vec![
        StoreTranslation.table_name(),
        LocationTranslation.table_name(),
        StockLineTranslation.table_name()
    ]
);

// also should have
// ClinicianTranslation.table_name(),
create_v7_translator!(
    InvoiceTranslation,
    "v7_Invoice",
    ChangelogTableName::Invoice,
    InvoiceRow,
    InvoiceRowRepository,
    vec![
        NameTranslation.table_name(),
        StoreTranslation.table_name(),
        CurrencyTranslation.table_name()
    ]
);

// Also should have
// ReasonTranslation.table_name(),
create_v7_translator!(
    InvoiceLineTranslation,
    "v7_InvoiceLine",
    ChangelogTableName::InvoiceLine,
    InvoiceLineRow,
    InvoiceLineRowRepository,
    vec![
        InvoiceTranslation.table_name(),
        ItemTranslation.table_name(),
        StockLineTranslation.table_name(),
        LocationTranslation.table_name(),
        CurrencyTranslation.table_name()
    ]
);

create_v7_translator!(
    StocktakeTranslation,
    "v7_Stocktake",
    ChangelogTableName::Stocktake,
    StocktakeRow,
    StocktakeRowRepository,
    vec![
        InvoiceTranslation.table_name(),
        StoreTranslation.table_name()
    ]
);

// Also should have
// ReasonTranslation.table_name()
create_v7_translator!(
    StocktakeLineTranslation,
    "v7_StocktakeLine",
    ChangelogTableName::StocktakeLine,
    StocktakeLineRow,
    StocktakeLineRowRepository,
    vec![
        StocktakeTranslation.table_name(),
        StockLineTranslation.table_name(),
        ItemTranslation.table_name(),
        LocationTranslation.table_name(),
    ]
);

// Also should have
// PeriodTranslation.table_name(),
create_v7_translator!(
    RequisitionTranslation,
    "v7_Requisition",
    ChangelogTableName::Requisition,
    RequisitionRow,
    RequisitionRowRepository,
    vec![
        NameTranslation.table_name(),
        StoreTranslation.table_name(),
        MasterListTranslation.table_name()
    ]
);

create_v7_translator!(
    RequisitionLineTranslation,
    "v7_RequisitionLine",
    ChangelogTableName::RequisitionLine,
    RequisitionLineRow,
    RequisitionLineRowRepository,
    vec![
        RequisitionTranslation.table_name(),
        ItemTranslation.table_name()
    ]
);

create_v7_translator!(
    ActivityLogTranslation,
    "v7_ActivityLog",
    ChangelogTableName::ActivityLog,
    ActivityLogRow,
    ActivityLogRowRepository,
    vec![StoreTranslation.table_name()]
);

create_v7_translator!(
    NameStoreJoinTranslation,
    "v7_NameStoreJoin",
    ChangelogTableName::NameStoreJoin,
    NameStoreJoinRow,
    NameStoreJoinRepository,
    vec![NameTranslation.table_name(), StoreTranslation.table_name()]
);

create_v7_translator!(
    CurrencyTranslation,
    "v7_currency",
    ChangelogTableName::Currency,
    CurrencyRow,
    CurrencyRowRepository,
    vec![]
);

pub(crate) fn all_translators_v7() -> SyncTranslators {
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
        NameStoreJoinTranslation::boxed(),
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
        CurrencyTranslation::boxed(),
        UserPermissionTranslation::boxed(),
        UserStoreJoinTranslation::boxed(),
    ]
}
