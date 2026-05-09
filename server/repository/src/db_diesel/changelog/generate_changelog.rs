// All `generate_changelog` implementations live here so the sync mechanism
// can be read as a whole. Sections below group impls by the characteristic
// of how the changelog row is built (store_id, transfer_store_id, parent linking, etc).

use super::{ChangeLogInsertRow, ChangelogTableName, RowActionType, RowOrId, SourceSiteId};
// Types re-exported flat at the crate root via `pub use db_diesel::*`.
use crate::*;
// Types only reachable via their full submodule path (no flat re-export).
use crate::{
    assets::{
        asset_catalogue_item_row::AssetCatalogueItemRow,
        asset_category_row::AssetCategoryRow,
        asset_class_row::AssetClassRow,
        asset_internal_location_row::{
            AssetInternalLocationRow, AssetInternalLocationRowRepository,
        },
        asset_log_reason_row::AssetLogReasonRow,
        asset_log_row::AssetLogRow,
        asset_property_row::AssetPropertyRow,
        asset_row::{AssetRow, AssetRowRepository},
        asset_type_row::AssetTypeRow,
    },
    campaign::campaign_row::CampaignRow,
    category_row::CategoryRow,
    contact_form_row::ContactFormRow,
    contact_trace_row::ContactTraceRow,
    item_category_row::ItemCategoryJoinRow,
    item_variant::{
        bundled_item_row::BundledItemRow, item_variant_row::ItemVariantRow,
        packaging_variant_row::PackagingVariantRow,
    },
    name_insurance_join_row::NameInsuranceJoinRow,
    system_log_row::SystemLogRow,
    vaccine_course::{
        vaccine_course_dose_row::VaccineCourseDoseRow,
        vaccine_course_item_row::VaccineCourseItemRow, vaccine_course_row::VaccineCourseRow,
        vaccine_course_store_config_row::VaccineCourseStoreConfigRow,
    },
    vvm_status::{
        vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
        vvm_status_row::VVMStatusRow,
    },
};

/// Returned from `PurchaseOrderLineRow::generate_changelogs`.
/// Mutating a purchase order line also generates a changelog for the parent
/// purchase order so it syncs.
pub(crate) struct Changelogs {
    pub(crate) purchase_order_changelog: ChangeLogInsertRow,
    pub(crate) purchase_order_line_changelog: ChangeLogInsertRow,
}

/// Resolve `name_id` to the id of the store that backs that name (if any).
/// Used when a record references a name and we want the changelog's
/// `transfer_store_id` to point at the corresponding store.
fn transfer_store_id_for_name(
    con: &StorageConnection,
    name_id: &str,
) -> Result<Option<String>, RepositoryError> {
    Ok(StoreRowRepository::new(con)
        .find_one_by_name_id(name_id)?
        .map(|s| s.id))
}

// ==========================================================================
// Records resolved by RowOrId — sets store_id AND transfer_store_id
// --------------------------------------------------------------------------
// Mutating methods may have either the full row or just an id (e.g. delete by id),
// so the row is fetched when only an id is given. These records reference another
// party (a customer/supplier name); the changelog stores that party's store as
// `transfer_store_id` so the changelog can be sharded/filtered per store. Invoice
// reads it directly from `name_store_id`; the others look it up via the name.
// ==========================================================================

impl InvoiceRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<InvoiceRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(id) => &InvoiceRowRepository::new(con)
                .find_one_by_id(id)?
                .ok_or(RepositoryError::NotFound)?,
        };

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Invoice,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            // For patient this will always be None
            transfer_store_id: row.name_store_id.clone(),
            patient_id: (row.r#type == InvoiceType::Prescription).then_some(row.name_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl RequisitionRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<RequisitionRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &RequisitionRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Requisition,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            transfer_store_id: row.name_store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl RnRFormRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<RnRFormRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &RnRFormRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::RnrForm,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            transfer_store_id: transfer_store_id_for_name(con, &row.name_id)?,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NameStoreJoinRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<NameStoreJoinRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &NameStoreJoinRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameStoreJoin,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            transfer_store_id: transfer_store_id_for_name(con, &row.name_id)?,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

// ==========================================================================
// Records resolved by RowOrId — sets store_id only
// --------------------------------------------------------------------------
// Same RowOrId pattern, but only store-scoped (no name link).
// ==========================================================================

impl StockLineRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<StockLineRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &StockLineRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::StockLine,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl StocktakeRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<StocktakeRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &StocktakeRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Stocktake,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl LocationRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<LocationRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &LocationRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Location,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PurchaseOrderRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<PurchaseOrderRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &PurchaseOrderRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PurchaseOrder,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PreferenceRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<PreferenceRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &PreferenceRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Preference,
            record_id: row.id.clone(),
            row_action: action,
            store_id: row.store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl VVMStatusLogRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<VVMStatusLogRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &VVMStatusLogRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VVMStatusLog,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

// ==========================================================================
// Lines that inherit their parent's changelog
// --------------------------------------------------------------------------
// Line records ride along with the parent. The parent's changelog is generated first,
// then we override `table_name` and `record_id` so it points at the line. This keeps
// store_id / transfer_store_id / source_site_id consistent between parent and line.
// ==========================================================================

impl InvoiceLineRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<InvoiceLineRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &InvoiceLineRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        let invoice_changelog = InvoiceRow::generate_changelog(
            RowOrId::Id(&row.invoice_id),
            con,
            action,
            source_site_id,
        )?;
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::InvoiceLine,
            record_id: row.id.clone(),
            ..invoice_changelog
        })
    }
}

impl StocktakeLineRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<StocktakeLineRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &StocktakeLineRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        let stocktake_changelog = StocktakeRow::generate_changelog(
            RowOrId::Id(&row.stocktake_id),
            con,
            action,
            source_site_id,
        )?;
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::StocktakeLine,
            record_id: row.id.clone(),
            ..stocktake_changelog
        })
    }
}

impl RequisitionLineRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<RequisitionLineRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &RequisitionLineRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        let requisition_changelog = RequisitionRow::generate_changelog(
            RowOrId::Id(&row.requisition_id),
            con,
            action,
            source_site_id,
        )?;
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::RequisitionLine,
            record_id: row.id.clone(),
            ..requisition_changelog
        })
    }
}

impl RnRFormLineRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<RnRFormLineRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &RnRFormLineRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        let rnr_form_changelog = RnRFormRow::generate_changelog(
            RowOrId::Id(&row.rnr_form_id),
            con,
            action,
            source_site_id,
        )?;
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::RnrFormLine,
            record_id: row.id.clone(),
            ..rnr_form_changelog
        })
    }
}

// ==========================================================================
// Lines that emit BOTH parent and child changelogs
// --------------------------------------------------------------------------
// Mutating a purchase order line also nudges the parent purchase order to re-sync,
// so we emit two changelogs and let the caller batch-insert them.
// ==========================================================================

impl PurchaseOrderLineRow {
    pub(crate) fn generate_changelogs(
        row_or_id: RowOrId<PurchaseOrderLineRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<Changelogs, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &PurchaseOrderLineRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        let purchase_order_changelog = PurchaseOrderRow::generate_changelog(
            RowOrId::Id(&row.purchase_order_id),
            con,
            RowActionType::Upsert, // Even when deleting purchase order line the parent changelog should be only upsert
            source_site_id,
        )?;
        let purchase_order_line_changelog = ChangeLogInsertRow {
            table_name: ChangelogTableName::PurchaseOrderLine,
            record_id: row.id.clone(),
            row_action: action,
            ..purchase_order_changelog.clone()
        };

        Ok(Changelogs {
            purchase_order_changelog,
            purchase_order_line_changelog,
        })
    }
}

// ==========================================================================
// Built from &self — store-scoped (action already has the row)
// --------------------------------------------------------------------------
// These are called from upsert/delete flows that already hold the row, so we read
// store_id directly from `self` without an extra repository lookup.
// ==========================================================================

impl ActivityLogRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ActivityLog,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl LocationMovementRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::LocationMovement,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ContactFormRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ContactForm,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl TemperatureBreachRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::TemperatureBreach,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl TemperatureLogRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::TemperatureLog,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl SensorRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Sensor,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PluginDataRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PluginData,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl VaccineCourseStoreConfigRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseStoreConfig,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Asset,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

// ==========================================================================
// Built from &self — patient-scoped
// --------------------------------------------------------------------------
// Patient-scoped records use patient_id so the changelog can
// be filtered/sharded per patient.
// ==========================================================================

impl VaccinationRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Vaccination,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            patient_id: Some(self.patient_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl EncounterRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Encounter,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            patient_id: Some(self.patient_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

// ==========================================================================
// Cross-table lookups for store_id
// --------------------------------------------------------------------------
// These records don't carry a store_id directly, so we query a related row to derive it.
// ==========================================================================

impl AssetLogRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let store_id = AssetRowRepository::new(con)
            .find_one_by_id(&self.asset_id)?
            .and_then(|a| a.store_id);

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetLog,
            record_id: self.id.clone(),
            row_action: action,
            store_id,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetInternalLocationRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<AssetInternalLocationRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &AssetInternalLocationRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };

        let store_id_location = LocationRowRepository::new(con)
            .find_one_by_id(&row.location_id)?
            .map(|r| r.store_id);

        let store_id_asset = AssetRowRepository::new(con)
            .find_one_by_id(&row.asset_id)?
            .and_then(|r| r.store_id);

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetInternalLocation,
            record_id: row.id.clone(),
            row_action: action,
            store_id: store_id_location.or(store_id_asset),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

// ==========================================================================
// Central data — record_id only
// --------------------------------------------------------------------------
// Non-store-scoped reference data: only `record_id`, `table_name`, `row_action`,
// and `source_site_id` are set. No row lookup is needed because the changelog row
// doesn't carry any per-row metadata.
// ==========================================================================

impl NameRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<NameRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &NameRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };

        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Name,
            record_id: row.id.clone(),
            row_action: action,
            patient_id: (row.r#type == NameRowType::Patient).then_some(row.id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NameOmsFieldsRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameOmsFields,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NamePropertyRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameProperty,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NameInsuranceJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameInsuranceJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl InsuranceProviderRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::InsuranceProvider,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ClinicianRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Clinician,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ClinicianStoreJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ClinicianStoreJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl CurrencyRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Currency,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl BarcodeRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Barcode,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl MasterListRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::MasterList,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl IndicatorValueRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::IndicatorValue,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl DemographicRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Demographic,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PropertyRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Property,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl VaccineCourseRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourse,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl VaccineCourseItemRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseItem,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl VaccineCourseDoseRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VaccineCourseDose,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemVariantRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemVariant,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PackagingVariantRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PackagingVariant,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl BundledItemRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::BundledItem,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl BackendPluginRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::BackendPlugin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl FrontendPluginRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::FrontendPlugin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl FormSchemaJson {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::FormSchema,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ReportRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Report,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl DocumentRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Document,
            record_id: self.id.clone(),
            row_action: action,
            patient_id: self.owner_name_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl SystemLogRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::SystemLog,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl SyncMessageRow {
    pub(crate) fn generate_changelog(
        row_or_id: RowOrId<SyncMessageRow>,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = match row_or_id {
            RowOrId::Row(row) => row,
            RowOrId::Id(row_id) => &SyncMessageRowRepository::new(con)
                .find_one_by_id(row_id)?
                .ok_or(RepositoryError::NotFound)?,
        };
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::SyncMessage,
            record_id: row.id.clone(),
            row_action: action,
            // Hybrid Remote+Central routing: when `to_store_id` is set the
            // row routes to the owning site only (Remote); when it's None it
            // fans out to every site (Central).
            store_id: row.to_store_id.clone(),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl SyncFileReferenceRow {
    pub(crate) fn generate_changelog(
        changelog_record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::SyncFileReference,
            record_id: changelog_record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl CampaignRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Campaign,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetClassRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetClass,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetCategoryRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCategory,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetTypeRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCatalogueType,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetCatalogueItemRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetCatalogueItem,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetLogReasonRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetLogReason,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AssetPropertyRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AssetProperty,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl AbbreviationRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Abbreviation,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl CategoryRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Category,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ContactRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Contact,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ContactTraceRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ContactTrace,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ContextRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Context,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl DemographicIndicatorRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::DemographicIndicator,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl DiagnosisRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Diagnosis,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl DocumentRegistryRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::DocumentRegistry,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl IndicatorColumnRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::IndicatorColumn,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl IndicatorLineRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::IndicatorLine,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemCategoryJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemCategoryJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemDirectionRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemDirection,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemStoreJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemStoreJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemWarningJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemWarningJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl MasterListLineRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::MasterListLine,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl MasterListNameJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::MasterListNameJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NameTagRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameTag,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NameTagJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameTagJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PeriodRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Period,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PeriodScheduleRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::PeriodSchedule,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl PrinterRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Printer,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Program,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramEnrolmentRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramEnrolment,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramEventRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramEvent,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramIndicatorRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramIndicator,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramRequisitionOrderTypeRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramRequisitionOrderType,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramRequisitionSettingsRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramRequisitionSettings,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ReasonOptionRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ReasonOption,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ShippingMethodRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ShippingMethod,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl StorePreferenceRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::StorePreference,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl UserAccountRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::UserAccount,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl UserPermissionRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::UserPermission,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl UserStoreJoinRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::UserStoreJoin,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl VVMStatusRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::VVMStatus,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Item,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl UnitRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Unit,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl LocationTypeRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::LocationType,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl StoreRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Store,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl SiteRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Site,
            record_id,
            row_action: action,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}
