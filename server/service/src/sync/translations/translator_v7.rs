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
    "asset_category",
    ChangelogTableName::AssetCategory,
    AssetCategoryRow,
    AssetCategoryRowRepository,
    vec![AssetClassTranslation.table_name()]
);

use repository::asset_row::*;
create_v7_translator!(
    AssetTranslation,
    "asset",
    ChangelogTableName::Asset,
    AssetRow,
    AssetRowRepository,
    vec![AssetCategoryTranslation.table_name()]
);

use repository::asset_type_row::*;
create_v7_translator!(
    AssetTypeTranslation,
    "asset_catalogue_type",
    ChangelogTableName::AssetCatalogueType,
    AssetTypeRow,
    AssetTypeRowRepository,
    vec![AssetCategoryTranslation.table_name()]
);

use repository::asset_catalogue_item_row::*;
create_v7_translator!(
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
create_v7_translator!(
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
create_v7_translator!(
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
create_v7_translator!(
    AssetLogReasonTranslation,
    "asset_log_reason",
    ChangelogTableName::AssetLogReason,
    AssetLogReasonRow,
    AssetLogReasonRowRepository,
    vec![]
);

use repository::asset_log_row::*;
create_v7_translator!(
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

create_v7_translator!(
    SyncFileReferenceTranslation,
    "sync_file_reference",
    ChangelogTableName::SyncFileReference,
    SyncFileReferenceRow,
    SyncFileReferenceRowRepository,
    vec![AssetTranslation.table_name()]
);

create_v7_translator!(
    UserTranslation,
    "user",
    ChangelogTableName::User,
    UserAccountRow,
    UserAccountRowRepository,
    vec![]
);

create_v7_translator!(
    NameTranslation,
    "name",
    ChangelogTableName::Name,
    NameRow,
    NameRowRepository,
    vec![]
);

create_v7_translator!(
    NameTagTranslation,
    "name_tag",
    ChangelogTableName::NameTag,
    NameTagRow,
    NameTagRowRepository,
    vec![]
);

create_v7_translator!(
    NameTagJoinTranslation,
    "name_tag_join",
    ChangelogTableName::NameTagJoin,
    NameTagJoinRow,
    NameTagJoinRepository,
    vec![]
);

create_v7_translator!(
    UnitTranslation,
    "unit",
    ChangelogTableName::Unit,
    UnitRow,
    UnitRowRepository,
    vec![]
);

create_v7_translator!(
    ItemTranslation,
    "Item",
    ChangelogTableName::Item,
    ItemRow,
    ItemRowRepository,
    vec![]
);

create_v7_translator!(
    StoreTranslation,
    "Store",
    ChangelogTableName::Store,
    StoreRow,
    StoreRowRepository,
    vec![]
);

create_v7_translator!(
    MasterListTranslation,
    "MasterList",
    ChangelogTableName::MasterList,
    MasterListRow,
    MasterListRowRepository,
    vec![]
);

create_v7_translator!(
    MasterListLineTranslation,
    "MasterListLine",
    ChangelogTableName::MasterListLine,
    MasterListLineRow,
    MasterListLineRowRepository,
    vec![]
);

create_v7_translator!(
    MasterListNameJoinTranslation,
    "MasterListNameJoin",
    ChangelogTableName::MasterListNameJoin,
    MasterListNameJoinRow,
    MasterListNameJoinRepository,
    vec![]
);

create_v7_translator!(
    LocationTranslation,
    "Location",
    ChangelogTableName::Location,
    LocationRow,
    LocationRowRepository,
    vec![]
);

create_v7_translator!(
    LocationMovementTranslation,
    "LocationMovement",
    ChangelogTableName::LocationMovement,
    LocationMovementRow,
    LocationMovementRowRepository,
    vec![]
);

create_v7_translator!(
    StockLineTranslation,
    "StockLine",
    ChangelogTableName::StockLine,
    StockLineRow,
    StockLineRowRepository,
    vec![]
);

create_v7_translator!(
    InvoiceTranslation,
    "Invoice",
    ChangelogTableName::Invoice,
    InvoiceRow,
    InvoiceRowRepository,
    vec![]
);

create_v7_translator!(
    InvoiceLineTranslation,
    "InvoiceLine",
    ChangelogTableName::InvoiceLine,
    InvoiceLineRow,
    InvoiceLineRowRepository,
    vec![]
);

create_v7_translator!(
    StocktakeTranslation,
    "Stocktake",
    ChangelogTableName::Stocktake,
    StocktakeRow,
    StocktakeRowRepository,
    vec![]
);

create_v7_translator!(
    StocktakeLineTranslation,
    "StocktakeLine",
    ChangelogTableName::StocktakeLine,
    StocktakeLineRow,
    StocktakeLineRowRepository,
    vec![]
);

create_v7_translator!(
    RequisitionTranslation,
    "Requisition",
    ChangelogTableName::Requisition,
    RequisitionRow,
    RequisitionRowRepository,
    vec![]
);

create_v7_translator!(
    RequisitionLineTranslation,
    "RequisitionLine",
    ChangelogTableName::RequisitionLine,
    RequisitionLineRow,
    RequisitionLineRowRepository,
    vec![]
);

create_v7_translator!(
    ActivityLogTranslation,
    "ActivityLog",
    ChangelogTableName::ActivityLog,
    ActivityLogRow,
    ActivityLogRowRepository,
    vec![]
);

create_v7_translator!(
    NameStoreJoinTranslation,
    "NameStoreJoin",
    ChangelogTableName::NameStoreJoin,
    NameStoreJoinRow,
    NameStoreJoinRepository,
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
    ]
}
