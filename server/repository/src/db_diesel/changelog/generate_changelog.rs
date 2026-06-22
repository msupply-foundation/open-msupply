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
    contact_trace_row::{ContactTraceRow, ContactTraceRowRepository},
    item_category_row::{ItemCategoryJoinRow, ItemCategoryJoinRowRepository},
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
            transfer_store_id: transfer_store_id_for_name(con, &row.name_id)?,
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

impl ClinicianStoreJoinRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ClinicianStoreJoin,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl IndicatorValueRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::IndicatorValue,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ItemStoreJoinRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemStoreJoin,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

// ==========================================================================
// Built from &self — patient-scoped
// --------------------------------------------------------------------------
// Patient-scoped records use patient_link_id so the changelog can
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

impl ContactTraceRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ContactTrace,
            record_id: self.id.clone(),
            row_action: action,
            store_id: self.store_id.clone(),
            patient_id: Some(self.patient_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl NameInsuranceJoinRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameInsuranceJoin,
            record_id: self.id.clone(),
            row_action: action,
            patient_id: Some(self.name_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramEnrolmentRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramEnrolment,
            record_id: self.id.clone(),
            row_action: action,
            patient_id: Some(self.patient_id.clone()),
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

impl ProgramEventRow {
    pub(crate) fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::ProgramEvent,
            record_id: self.id.clone(),
            row_action: action,
            patient_id: self.patient_id.clone(),
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

impl AncillaryItemRow {
    pub(crate) fn generate_changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::AncillaryItem,
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

// ============================================================================
// Sync integration carrier + dispatch (replaces the deleted Upsert/Delete traits).
//
// Incoming (pull-side) upserts are carried as the `Row` enum (the same carrier
// push uses); deletes are carried by identity (table + record_id); a small set of
// non-changelog rows (link tables, sync_request) ride in `NonSyncRow`.
//
// Integration is split so callers control changelog insertion: v5/v6 build the
// changelog via `Row::generate_changelog`; v7 uses the changelog row it already
// constructed. Both write the row via `Row::integrate_no_changelog`.
// ============================================================================

/// Rows written during integration that are not in the changelog and never pushed
/// over sync (link resolution + remote-local sync_request).
#[derive(Debug)]
pub enum NonSyncRow {
    NameLink(NameLinkRow),
    ItemLink(ItemLinkRow),
    ClinicianLink(ClinicianLinkRow),
    SyncRequest(SyncRequestRow),
    Warning(WarningRow),
}

impl NonSyncRow {
    pub fn upsert_no_changelog(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        match self {
            NonSyncRow::NameLink(r) => NameLinkRowRepository::new(con).upsert_one(r),
            NonSyncRow::ItemLink(r) => ItemLinkRowRepository::new(con).upsert_one(r),
            NonSyncRow::ClinicianLink(r) => ClinicianLinkRowRepository::new(con).upsert_one(r),
            NonSyncRow::SyncRequest(r) => SyncRequestRepository::new(con).upsert_one(r),
            NonSyncRow::Warning(r) => WarningRowRepository::new(con).upsert_one(r),
        }
    }
}

pub enum BatchOperation {
    Upsert(Row),
    Delete {
        table_name: ChangelogTableName,
        record_id: String,
    },
}

impl Row {
    /// Write the row only (no changelog), dispatching to the concrete repository's
    /// private row-only writer. Mirrors what `Upsert::upsert_sync` did before it
    /// inserted the changelog.
    pub fn integrate_no_changelog(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        match self {
            Row::Abbreviation(r) => AbbreviationRowRepository::new(con)._upsert_one(r)?,
            Row::ActivityLog(r) => ActivityLogRowRepository::new(con)._insert_one(r)?,
            Row::AncillaryItem(r) => AncillaryItemRowRepository::new(con)._upsert(r)?,
            Row::Asset(r) => AssetRowRepository::new(con)._upsert_one(r)?,
            Row::AssetCatalogueItem(r) => {
                AssetCatalogueItemRowRepository::new(con)._upsert_one(r)?
            }
            Row::AssetCatalogueType(r) => AssetTypeRowRepository::new(con)._upsert_one(r)?,
            Row::AssetCategory(r) => AssetCategoryRowRepository::new(con)._upsert_one(r)?,
            Row::AssetClass(r) => AssetClassRowRepository::new(con)._upsert_one(r)?,
            Row::AssetInternalLocation(r) => {
                AssetInternalLocationRowRepository::new(con)._upsert_one(r)?
            }
            Row::AssetLog(r) => AssetLogRowRepository::new(con)._upsert_one(r)?,
            Row::AssetLogReason(r) => AssetLogReasonRowRepository::new(con)._upsert_one(r)?,
            Row::AssetProperty(r) => AssetPropertyRowRepository::new(con)._upsert_one(r)?,
            Row::BackendPlugin(r) => BackendPluginRowRepository::new(con)._upsert_one(r)?,
            Row::Barcode(r) => BarcodeRowRepository::new(con)._upsert(r)?,
            Row::BundledItem(r) => BundledItemRowRepository::new(con)._upsert_one(r)?,
            Row::Campaign(r) => CampaignRowRepository::new(con)._upsert_one(r)?,
            Row::Category(r) => CategoryRowRepository::new(con)._upsert_one(r)?,
            Row::Clinician(r) => ClinicianRowRepository::new(con)._upsert_one(r)?,
            Row::ClinicianStoreJoin(r) => {
                ClinicianStoreJoinRowRepository::new(con)._upsert_one(r)?
            }
            Row::Contact(r) => ContactRowRepository::new(con)._upsert(r)?,
            Row::ContactForm(r) => ContactFormRowRepository::new(con)._upsert_one(r)?,
            Row::ContactTrace(r) => ContactTraceRowRepository::new(con)._upsert_one(r)?,
            Row::Context(r) => ContextRowRepository::new(con)._upsert_one(r)?,
            Row::Currency(r) => CurrencyRowRepository::new(con)._upsert_one(r)?,
            Row::Demographic(r) => DemographicRowRepository::new(con)._upsert_one(r)?,
            Row::DemographicIndicator(r) => {
                DemographicIndicatorRowRepository::new(con)._upsert_one(r)?
            }
            Row::Diagnosis(r) => DiagnosisRowRepository::new(con)._upsert_one(r)?,
            Row::Document(r) => DocumentRepository::new(con)._upsert(r)?,
            Row::DocumentRegistry(r) => DocumentRegistryRowRepository::new(con)._upsert_one(r)?,
            Row::Encounter(r) => EncounterRowRepository::new(con)._upsert(r)?,
            Row::FormSchema(r) => FormSchemaRowRepository::new(con)._upsert_one_row(r)?,
            Row::FrontendPlugin(r) => FrontendPluginRowRepository::new(con)._upsert_one(r)?,
            Row::IndicatorColumn(r) => IndicatorColumnRowRepository::new(con)._upsert_one(r)?,
            Row::IndicatorLine(r) => IndicatorLineRowRepository::new(con)._upsert_one(r)?,
            Row::IndicatorValue(r) => IndicatorValueRowRepository::new(con)._upsert(r)?,
            Row::InsuranceProvider(r) => InsuranceProviderRowRepository::new(con)._upsert_one(r)?,
            Row::Invoice(r) => InvoiceRowRepository::new(con)._upsert(r)?,
            Row::InvoiceLine(r) => InvoiceLineRowRepository::new(con)._upsert(r)?,
            Row::Item(r) => ItemRowRepository::new(con)._upsert_one(r)?,
            Row::ItemCategoryJoin(r) => ItemCategoryJoinRowRepository::new(con)._upsert_one(r)?,
            Row::ItemDirection(r) => ItemDirectionRowRepository::new(con)._upsert_one(r)?,
            Row::ItemStoreJoin(r) => ItemStoreJoinRowRepository::new(con)._upsert_one(r)?,
            Row::ItemVariant(r) => ItemVariantRowRepository::new(con)._upsert(r)?,
            Row::ItemWarningJoin(r) => ItemWarningJoinRowRepository::new(con)._upsert_one(r)?,
            Row::Location(r) => LocationRowRepository::new(con)._upsert_one(r)?,
            Row::LocationMovement(r) => LocationMovementRowRepository::new(con)._upsert_one(r)?,
            Row::LocationType(r) => LocationTypeRowRepository::new(con)._upsert_one(r)?,
            Row::MasterList(r) => MasterListRowRepository::new(con)._upsert_one(r)?,
            Row::MasterListLine(r) => MasterListLineRowRepository::new(con)._upsert_one(r)?,
            Row::MasterListNameJoin(r) => MasterListNameJoinRepository::new(con)._upsert(r)?,
            Row::Name(r) => NameRowRepository::new(con)._upsert_one(r)?,
            Row::NameInsuranceJoin(r) => NameInsuranceJoinRowRepository::new(con)._upsert(r)?,
            Row::NameOmsFields(r) => NameRowRepository::new(con)._upsert_oms_fields_one(r)?,
            Row::NameProperty(r) => NamePropertyRowRepository::new(con)._upsert_one(r)?,
            Row::NameStoreJoin(r) => NameStoreJoinRepository::new(con)._upsert(r)?,
            Row::NameTag(r) => NameTagRowRepository::new(con)._upsert_one(r)?,
            Row::NameTagJoin(r) => NameTagJoinRepository::new(con)._upsert(r)?,
            Row::PackagingVariant(r) => PackagingVariantRowRepository::new(con)._upsert_one(r)?,
            Row::Period(r) => PeriodRowRepository::new(con)._upsert_one(r)?,
            Row::PeriodSchedule(r) => PeriodScheduleRowRepository::new(con)._upsert_one(r)?,
            Row::PluginData(r) => PluginDataRowRepository::new(con)._upsert_one(r)?,
            Row::Preference(r) => PreferenceRowRepository::new(con)._upsert_one(r)?,
            Row::Printer(r) => PrinterRowRepository::new(con)._upsert_one(r)?,
            Row::Program(r) => ProgramRowRepository::new(con)._upsert_one(r)?,
            Row::ProgramEnrolment(r) => ProgramEnrolmentRowRepository::new(con)._upsert(r)?,
            Row::ProgramEvent(r) => ProgramEventRowRepository::new(con)._upsert(r)?,
            Row::ProgramIndicator(r) => ProgramIndicatorRowRepository::new(con)._upsert_one(r)?,
            Row::ProgramRequisitionOrderType(r) => {
                ProgramRequisitionOrderTypeRowRepository::new(con)._upsert_one(r)?
            }
            Row::ProgramRequisitionSettings(r) => {
                ProgramRequisitionSettingsRowRepository::new(con)._upsert_one(r)?
            }
            Row::Property(r) => PropertyRowRepository::new(con)._upsert_one(r)?,
            Row::PurchaseOrder(r) => PurchaseOrderRowRepository::new(con)._upsert(r)?,
            Row::PurchaseOrderLine(r) => PurchaseOrderLineRowRepository::new(con)._upsert(r)?,
            Row::ReasonOption(r) => ReasonOptionRowRepository::new(con)._upsert_one(r)?,
            Row::Report(r) => ReportRowRepository::new(con)._upsert_one(r)?,
            Row::Requisition(r) => RequisitionRowRepository::new(con)._upsert(r)?,
            Row::RequisitionLine(r) => RequisitionLineRowRepository::new(con)._upsert_one(r)?,
            Row::RnrForm(r) => RnRFormRowRepository::new(con)._upsert(r)?,
            Row::RnrFormLine(r) => RnRFormLineRowRepository::new(con)._upsert_one(r)?,
            Row::Sensor(r) => SensorRowRepository::new(con)._upsert_one(r)?,
            Row::ShippingMethod(r) => ShippingMethodRowRepository::new(con)._upsert_one(r)?,
            Row::Site(r) => SiteRowRepository::new(con)._upsert(r)?,
            Row::StockLine(r) => StockLineRowRepository::new(con)._upsert(r)?,
            Row::Stocktake(r) => StocktakeRowRepository::new(con)._upsert_one(r)?,
            Row::StocktakeLine(r) => StocktakeLineRowRepository::new(con)._upsert(r)?,
            Row::Store(r) => StoreRowRepository::new(con)._upsert(r)?,
            Row::StorePreference(r) => StorePreferenceRowRepository::new(con)._upsert_one(r)?,
            Row::SyncFileReference(r) => SyncFileReferenceRowRepository::new(con)._upsert_one(r)?,
            Row::SyncMessage(r) => SyncMessageRowRepository::new(con)._upsert_one(r)?,
            Row::SystemLog(r) => SystemLogRowRepository::new(con)._insert_one(r)?,
            Row::TemperatureBreach(r) => TemperatureBreachRowRepository::new(con)._upsert_one(r)?,
            Row::TemperatureLog(r) => TemperatureLogRowRepository::new(con)._upsert_one(r)?,
            Row::Unit(r) => UnitRowRepository::new(con)._upsert_one(r)?,
            Row::UserAccount(r) => UserAccountRowRepository::new(con)._upsert_one(r)?,
            Row::UserPermission(r) => UserPermissionRowRepository::new(con)._upsert_one(r)?,
            Row::UserStoreJoin(r) => UserStoreJoinRowRepository::new(con)._upsert_one(r)?,
            Row::VVMStatus(r) => VVMStatusRowRepository::new(con)._upsert_one(r)?,
            Row::VVMStatusLog(r) => VVMStatusLogRowRepository::new(con)._upsert_one(r)?,
            Row::Vaccination(r) => VaccinationRowRepository::new(con)._upsert_one(r)?,
            Row::VaccineCourse(r) => VaccineCourseRowRepository::new(con)._upsert_one(r)?,
            Row::VaccineCourseDose(r) => VaccineCourseDoseRowRepository::new(con)._upsert_one(r)?,
            Row::VaccineCourseItem(r) => VaccineCourseItemRowRepository::new(con)._upsert_one(r)?,
            Row::VaccineCourseStoreConfig(r) => {
                VaccineCourseStoreConfigRowRepository::new(con)._upsert_one(r)?
            }
        };
        Ok(())
    }

    /// (table_name, record_id) for this row, mapped directly per variant (no changelog
    /// round-trip). The variant name matches its `ChangelogTableName`; `Site` has an i32 id.
    fn detail(&self) -> (ChangelogTableName, String) {
        match self {
            Row::ActivityLog(r) => (ChangelogTableName::ActivityLog, r.id.clone()),
            Row::Barcode(r) => (ChangelogTableName::Barcode, r.id.clone()),
            Row::Clinician(r) => (ChangelogTableName::Clinician, r.id.clone()),
            Row::ClinicianStoreJoin(r) => (ChangelogTableName::ClinicianStoreJoin, r.id.clone()),
            Row::Currency(r) => (ChangelogTableName::Currency, r.id.clone()),
            Row::Document(r) => (ChangelogTableName::Document, r.id.clone()),
            Row::IndicatorValue(r) => (ChangelogTableName::IndicatorValue, r.id.clone()),
            Row::InsuranceProvider(r) => (ChangelogTableName::InsuranceProvider, r.id.clone()),
            Row::Item(r) => (ChangelogTableName::Item, r.id.clone()),
            Row::Location(r) => (ChangelogTableName::Location, r.id.clone()),
            Row::LocationMovement(r) => (ChangelogTableName::LocationMovement, r.id.clone()),
            Row::Name(r) => (ChangelogTableName::Name, r.id.clone()),
            Row::NameInsuranceJoin(r) => (ChangelogTableName::NameInsuranceJoin, r.id.clone()),
            Row::NameStoreJoin(r) => (ChangelogTableName::NameStoreJoin, r.id.clone()),
            Row::PurchaseOrder(r) => (ChangelogTableName::PurchaseOrder, r.id.clone()),
            Row::PurchaseOrderLine(r) => (ChangelogTableName::PurchaseOrderLine, r.id.clone()),
            Row::Sensor(r) => (ChangelogTableName::Sensor, r.id.clone()),
            Row::StockLine(r) => (ChangelogTableName::StockLine, r.id.clone()),
            Row::Stocktake(r) => (ChangelogTableName::Stocktake, r.id.clone()),
            Row::StocktakeLine(r) => (ChangelogTableName::StocktakeLine, r.id.clone()),
            Row::TemperatureBreach(r) => (ChangelogTableName::TemperatureBreach, r.id.clone()),
            Row::TemperatureLog(r) => (ChangelogTableName::TemperatureLog, r.id.clone()),
            Row::VVMStatusLog(r) => (ChangelogTableName::VVMStatusLog, r.id.clone()),
            Row::Requisition(r) => (ChangelogTableName::Requisition, r.id.clone()),
            Row::RequisitionLine(r) => (ChangelogTableName::RequisitionLine, r.id.clone()),
            Row::Invoice(r) => (ChangelogTableName::Invoice, r.id.clone()),
            Row::InvoiceLine(r) => (ChangelogTableName::InvoiceLine, r.id.clone()),
            Row::AssetCatalogueItem(r) => (ChangelogTableName::AssetCatalogueItem, r.id.clone()),
            Row::AssetCategory(r) => (ChangelogTableName::AssetCategory, r.id.clone()),
            Row::AssetClass(r) => (ChangelogTableName::AssetClass, r.id.clone()),
            Row::AssetLogReason(r) => (ChangelogTableName::AssetLogReason, r.id.clone()),
            Row::AssetProperty(r) => (ChangelogTableName::AssetProperty, r.id.clone()),
            Row::BackendPlugin(r) => (ChangelogTableName::BackendPlugin, r.id.clone()),
            Row::AncillaryItem(r) => (ChangelogTableName::AncillaryItem, r.id.clone()),
            Row::BundledItem(r) => (ChangelogTableName::BundledItem, r.id.clone()),
            Row::Campaign(r) => (ChangelogTableName::Campaign, r.id.clone()),
            Row::Demographic(r) => (ChangelogTableName::Demographic, r.id.clone()),
            Row::FormSchema(r) => (ChangelogTableName::FormSchema, r.id.clone()),
            Row::FrontendPlugin(r) => (ChangelogTableName::FrontendPlugin, r.id.clone()),
            Row::ItemVariant(r) => (ChangelogTableName::ItemVariant, r.id.clone()),
            Row::NameProperty(r) => (ChangelogTableName::NameProperty, r.id.clone()),
            Row::PackagingVariant(r) => (ChangelogTableName::PackagingVariant, r.id.clone()),
            Row::Property(r) => (ChangelogTableName::Property, r.id.clone()),
            Row::Report(r) => (ChangelogTableName::Report, r.id.clone()),
            Row::VaccineCourse(r) => (ChangelogTableName::VaccineCourse, r.id.clone()),
            Row::VaccineCourseDose(r) => (ChangelogTableName::VaccineCourseDose, r.id.clone()),
            Row::VaccineCourseItem(r) => (ChangelogTableName::VaccineCourseItem, r.id.clone()),
            Row::VaccineCourseStoreConfig(r) => {
                (ChangelogTableName::VaccineCourseStoreConfig, r.id.clone())
            }
            Row::LocationType(r) => (ChangelogTableName::LocationType, r.id.clone()),
            Row::MasterList(r) => (ChangelogTableName::MasterList, r.id.clone()),
            Row::Store(r) => (ChangelogTableName::Store, r.id.clone()),
            Row::Unit(r) => (ChangelogTableName::Unit, r.id.clone()),
            Row::Asset(r) => (ChangelogTableName::Asset, r.id.clone()),
            Row::AssetInternalLocation(r) => {
                (ChangelogTableName::AssetInternalLocation, r.id.clone())
            }
            Row::AssetLog(r) => (ChangelogTableName::AssetLog, r.id.clone()),
            Row::Encounter(r) => (ChangelogTableName::Encounter, r.id.clone()),
            Row::RnrForm(r) => (ChangelogTableName::RnrForm, r.id.clone()),
            Row::RnrFormLine(r) => (ChangelogTableName::RnrFormLine, r.id.clone()),
            Row::SyncMessage(r) => (ChangelogTableName::SyncMessage, r.id.clone()),
            Row::Vaccination(r) => (ChangelogTableName::Vaccination, r.id.clone()),
            Row::SyncFileReference(r) => (ChangelogTableName::SyncFileReference, r.id.clone()),
            Row::PluginData(r) => (ChangelogTableName::PluginData, r.id.clone()),
            Row::Preference(r) => (ChangelogTableName::Preference, r.id.clone()),
            Row::ContactForm(r) => (ChangelogTableName::ContactForm, r.id.clone()),
            Row::SystemLog(r) => (ChangelogTableName::SystemLog, r.id.clone()),
            Row::Abbreviation(r) => (ChangelogTableName::Abbreviation, r.id.clone()),
            Row::Category(r) => (ChangelogTableName::Category, r.id.clone()),
            Row::Contact(r) => (ChangelogTableName::Contact, r.id.clone()),
            Row::ContactTrace(r) => (ChangelogTableName::ContactTrace, r.id.clone()),
            Row::Context(r) => (ChangelogTableName::Context, r.id.clone()),
            Row::DemographicIndicator(r) => {
                (ChangelogTableName::DemographicIndicator, r.id.clone())
            }
            Row::Diagnosis(r) => (ChangelogTableName::Diagnosis, r.id.clone()),
            Row::DocumentRegistry(r) => (ChangelogTableName::DocumentRegistry, r.id.clone()),
            Row::IndicatorColumn(r) => (ChangelogTableName::IndicatorColumn, r.id.clone()),
            Row::IndicatorLine(r) => (ChangelogTableName::IndicatorLine, r.id.clone()),
            Row::ItemCategoryJoin(r) => (ChangelogTableName::ItemCategoryJoin, r.id.clone()),
            Row::ItemDirection(r) => (ChangelogTableName::ItemDirection, r.id.clone()),
            Row::ItemStoreJoin(r) => (ChangelogTableName::ItemStoreJoin, r.id.clone()),
            Row::ItemWarningJoin(r) => (ChangelogTableName::ItemWarningJoin, r.id.clone()),
            Row::MasterListLine(r) => (ChangelogTableName::MasterListLine, r.id.clone()),
            Row::MasterListNameJoin(r) => (ChangelogTableName::MasterListNameJoin, r.id.clone()),
            Row::NameTag(r) => (ChangelogTableName::NameTag, r.id.clone()),
            Row::NameTagJoin(r) => (ChangelogTableName::NameTagJoin, r.id.clone()),
            Row::Period(r) => (ChangelogTableName::Period, r.id.clone()),
            Row::PeriodSchedule(r) => (ChangelogTableName::PeriodSchedule, r.id.clone()),
            Row::Printer(r) => (ChangelogTableName::Printer, r.id.clone()),
            Row::Program(r) => (ChangelogTableName::Program, r.id.clone()),
            Row::ProgramEnrolment(r) => (ChangelogTableName::ProgramEnrolment, r.id.clone()),
            Row::ProgramEvent(r) => (ChangelogTableName::ProgramEvent, r.id.clone()),
            Row::ProgramIndicator(r) => (ChangelogTableName::ProgramIndicator, r.id.clone()),
            Row::ProgramRequisitionOrderType(r) => (
                ChangelogTableName::ProgramRequisitionOrderType,
                r.id.clone(),
            ),
            Row::ProgramRequisitionSettings(r) => {
                (ChangelogTableName::ProgramRequisitionSettings, r.id.clone())
            }
            Row::ReasonOption(r) => (ChangelogTableName::ReasonOption, r.id.clone()),
            Row::ShippingMethod(r) => (ChangelogTableName::ShippingMethod, r.id.clone()),
            Row::StorePreference(r) => (ChangelogTableName::StorePreference, r.id.clone()),
            Row::UserAccount(r) => (ChangelogTableName::UserAccount, r.id.clone()),
            Row::UserPermission(r) => (ChangelogTableName::UserPermission, r.id.clone()),
            Row::UserStoreJoin(r) => (ChangelogTableName::UserStoreJoin, r.id.clone()),
            Row::VVMStatus(r) => (ChangelogTableName::VVMStatus, r.id.clone()),
            Row::NameOmsFields(r) => (ChangelogTableName::NameOmsFields, r.id.clone()),
            Row::Site(r) => (ChangelogTableName::Site, r.id.to_string()),
            Row::AssetCatalogueType(r) => (ChangelogTableName::AssetCatalogueType, r.id.clone()),
        }
    }

    /// The changelog table this row belongs to.
    pub fn table_name(&self) -> ChangelogTableName {
        self.detail().0
    }

    /// This row's record id (as stored in the changelog).
    pub fn record_id(&self) -> String {
        self.detail().1
    }

    pub fn batch_upsert<T>(
        con: &StorageConnection,
        max_number_of_rows: usize,
        rows: &mut Vec<(BatchOperation, Vec<T>)>,
    ) -> (Vec<(BatchOperation, Vec<T>)>, Option<RepositoryError>) {
        let mut taken = Vec::new();
        macro_rules! concrete {
            ($variant:ident) => {{
                let mut exact_rows = Vec::new();
                for _ in 0..max_number_of_rows {
                    let Some(r) = rows.pop() else {
                        break;
                    };

                    if !matches!(r.0, BatchOperation::Upsert(Row::$variant(_))) {
                        rows.insert(0, r);
                        break;
                    }

                    taken.push(r);
                }
                // Now take as ref from taken
                taken.iter().for_each(|r| match r.0 {
                    BatchOperation::Upsert(Row::$variant(ref exact_row)) => {
                        exact_rows.push(exact_row);
                    }
                    _ => unreachable!("We just filtered these out in the loop above"),
                });

                exact_rows
            }};
        }
        let result = match self {
            // Tables wired up with `define_batch_table!` — real batched upsert.
            Row::Unit(_) => UnitRowRepository::new(con).batch_upsert(concrete!(Unit)),
            Row::ActivityLog(_) => {
                ActivityLogRowRepository::new(con).batch_upsert(concrete!(ActivityLog))
            }
            Row::Clinician(_) => {
                ClinicianRowRepository::new(con).batch_upsert(concrete!(Clinician))
            }
            Row::ClinicianStoreJoin(_) => ClinicianStoreJoinRowRepository::new(con)
                .batch_upsert(concrete!(ClinicianStoreJoin)),
            Row::Currency(_) => CurrencyRowRepository::new(con).batch_upsert(concrete!(Currency)),
            Row::InsuranceProvider(_) => {
                InsuranceProviderRowRepository::new(con).batch_upsert(concrete!(InsuranceProvider))
            }
            Row::Location(_) => LocationRowRepository::new(con).batch_upsert(concrete!(Location)),
            Row::LocationMovement(_) => {
                LocationMovementRowRepository::new(con).batch_upsert(concrete!(LocationMovement))
            }
            Row::Sensor(_) => SensorRowRepository::new(con).batch_upsert(concrete!(Sensor)),
            Row::Stocktake(_) => {
                StocktakeRowRepository::new(con).batch_upsert(concrete!(Stocktake))
            }
            Row::TemperatureBreach(_) => {
                TemperatureBreachRowRepository::new(con).batch_upsert(concrete!(TemperatureBreach))
            }
            Row::TemperatureLog(_) => {
                TemperatureLogRowRepository::new(con).batch_upsert(concrete!(TemperatureLog))
            }
            Row::VVMStatusLog(_) => {
                VVMStatusLogRowRepository::new(con).batch_upsert(concrete!(VVMStatusLog))
            }
            Row::RequisitionLine(_) => {
                RequisitionLineRowRepository::new(con).batch_upsert(concrete!(RequisitionLine))
            }
            Row::AssetCatalogueItem(_) => AssetCatalogueItemRowRepository::new(con)
                .batch_upsert(concrete!(AssetCatalogueItem)),
            Row::AssetCategory(_) => {
                AssetCategoryRowRepository::new(con).batch_upsert(concrete!(AssetCategory))
            }
            Row::AssetClass(_) => {
                AssetClassRowRepository::new(con).batch_upsert(concrete!(AssetClass))
            }
            Row::AssetLogReason(_) => {
                AssetLogReasonRowRepository::new(con).batch_upsert(concrete!(AssetLogReason))
            }
            Row::AssetProperty(_) => {
                AssetPropertyRowRepository::new(con).batch_upsert(concrete!(AssetProperty))
            }
            Row::BackendPlugin(_) => {
                BackendPluginRowRepository::new(con).batch_upsert(concrete!(BackendPlugin))
            }
            Row::BundledItem(_) => {
                BundledItemRowRepository::new(con).batch_upsert(concrete!(BundledItem))
            }
            Row::Campaign(_) => CampaignRowRepository::new(con).batch_upsert(concrete!(Campaign)),
            Row::Demographic(_) => {
                DemographicRowRepository::new(con).batch_upsert(concrete!(Demographic))
            }
            Row::FormSchema(_) => {
                FormSchemaRowRepository::new(con).batch_upsert(concrete!(FormSchema))
            }
            Row::FrontendPlugin(_) => {
                FrontendPluginRowRepository::new(con).batch_upsert(concrete!(FrontendPlugin))
            }
            Row::NameProperty(_) => {
                NamePropertyRowRepository::new(con).batch_upsert(concrete!(NameProperty))
            }
            Row::PackagingVariant(_) => {
                PackagingVariantRowRepository::new(con).batch_upsert(concrete!(PackagingVariant))
            }
            Row::Property(_) => PropertyRowRepository::new(con).batch_upsert(concrete!(Property)),
            Row::Report(_) => ReportRowRepository::new(con).batch_upsert(concrete!(Report)),
            Row::VaccineCourse(_) => {
                VaccineCourseRowRepository::new(con).batch_upsert(concrete!(VaccineCourse))
            }
            Row::VaccineCourseDose(_) => {
                VaccineCourseDoseRowRepository::new(con).batch_upsert(concrete!(VaccineCourseDose))
            }
            Row::VaccineCourseItem(_) => {
                VaccineCourseItemRowRepository::new(con).batch_upsert(concrete!(VaccineCourseItem))
            }
            Row::VaccineCourseStoreConfig(_) => VaccineCourseStoreConfigRowRepository::new(con)
                .batch_upsert(concrete!(VaccineCourseStoreConfig)),
            Row::LocationType(_) => {
                LocationTypeRowRepository::new(con).batch_upsert(concrete!(LocationType))
            }
            Row::MasterList(_) => {
                MasterListRowRepository::new(con).batch_upsert(concrete!(MasterList))
            }
            Row::Asset(_) => AssetRowRepository::new(con).batch_upsert(concrete!(Asset)),
            Row::AssetInternalLocation(_) => AssetInternalLocationRowRepository::new(con)
                .batch_upsert(concrete!(AssetInternalLocation)),
            Row::RnrFormLine(_) => {
                RnRFormLineRowRepository::new(con).batch_upsert(concrete!(RnrFormLine))
            }
            Row::SyncMessage(_) => {
                SyncMessageRowRepository::new(con).batch_upsert(concrete!(SyncMessage))
            }
            Row::SyncFileReference(_) => {
                SyncFileReferenceRowRepository::new(con).batch_upsert(concrete!(SyncFileReference))
            }
            Row::PluginData(_) => {
                PluginDataRowRepository::new(con).batch_upsert(concrete!(PluginData))
            }
            Row::Preference(_) => {
                PreferenceRowRepository::new(con).batch_upsert(concrete!(Preference))
            }
            Row::ContactForm(_) => {
                ContactFormRowRepository::new(con).batch_upsert(concrete!(ContactForm))
            }
            Row::SystemLog(_) => {
                SystemLogRowRepository::new(con).batch_upsert(concrete!(SystemLog))
            }
            Row::Abbreviation(_) => {
                AbbreviationRowRepository::new(con).batch_upsert(concrete!(Abbreviation))
            }
            Row::Category(_) => CategoryRowRepository::new(con).batch_upsert(concrete!(Category)),
            Row::Context(_) => ContextRowRepository::new(con).batch_upsert(concrete!(Context)),
            Row::DemographicIndicator(_) => DemographicIndicatorRowRepository::new(con)
                .batch_upsert(concrete!(DemographicIndicator)),
            Row::Diagnosis(_) => {
                DiagnosisRowRepository::new(con).batch_upsert(concrete!(Diagnosis))
            }
            Row::DocumentRegistry(_) => {
                DocumentRegistryRowRepository::new(con).batch_upsert(concrete!(DocumentRegistry))
            }
            Row::IndicatorColumn(_) => {
                IndicatorColumnRowRepository::new(con).batch_upsert(concrete!(IndicatorColumn))
            }
            Row::IndicatorLine(_) => {
                IndicatorLineRowRepository::new(con).batch_upsert(concrete!(IndicatorLine))
            }
            Row::ItemCategoryJoin(_) => {
                ItemCategoryJoinRowRepository::new(con).batch_upsert(concrete!(ItemCategoryJoin))
            }
            Row::ItemDirection(_) => {
                ItemDirectionRowRepository::new(con).batch_upsert(concrete!(ItemDirection))
            }
            Row::ItemStoreJoin(_) => {
                ItemStoreJoinRowRepository::new(con).batch_upsert(concrete!(ItemStoreJoin))
            }
            Row::ItemWarningJoin(_) => {
                ItemWarningJoinRowRepository::new(con).batch_upsert(concrete!(ItemWarningJoin))
            }
            Row::MasterListLine(_) => {
                MasterListLineRowRepository::new(con).batch_upsert(concrete!(MasterListLine))
            }
            Row::NameTag(_) => NameTagRowRepository::new(con).batch_upsert(concrete!(NameTag)),
            Row::Period(_) => PeriodRowRepository::new(con).batch_upsert(concrete!(Period)),
            Row::PeriodSchedule(_) => {
                PeriodScheduleRowRepository::new(con).batch_upsert(concrete!(PeriodSchedule))
            }
            Row::Printer(_) => PrinterRowRepository::new(con).batch_upsert(concrete!(Printer)),
            Row::Program(_) => ProgramRowRepository::new(con).batch_upsert(concrete!(Program)),
            Row::ProgramIndicator(_) => {
                ProgramIndicatorRowRepository::new(con).batch_upsert(concrete!(ProgramIndicator))
            }
            Row::ProgramRequisitionOrderType(_) => {
                ProgramRequisitionOrderTypeRowRepository::new(con)
                    .batch_upsert(concrete!(ProgramRequisitionOrderType))
            }
            Row::ProgramRequisitionSettings(_) => ProgramRequisitionSettingsRowRepository::new(con)
                .batch_upsert(concrete!(ProgramRequisitionSettings)),
            Row::ReasonOption(_) => {
                ReasonOptionRowRepository::new(con).batch_upsert(concrete!(ReasonOption))
            }
            Row::ShippingMethod(_) => {
                ShippingMethodRowRepository::new(con).batch_upsert(concrete!(ShippingMethod))
            }
            Row::StorePreference(_) => {
                StorePreferenceRowRepository::new(con).batch_upsert(concrete!(StorePreference))
            }
            Row::UserAccount(_) => {
                UserAccountRowRepository::new(con).batch_upsert(concrete!(UserAccount))
            }
            Row::UserPermission(_) => {
                UserPermissionRowRepository::new(con).batch_upsert(concrete!(UserPermission))
            }
            Row::UserStoreJoin(_) => {
                UserStoreJoinRowRepository::new(con).batch_upsert(concrete!(UserStoreJoin))
            }
            Row::VVMStatus(_) => {
                VVMStatusRowRepository::new(con).batch_upsert(concrete!(VVMStatus))
            }
            Row::AssetCatalogueType(_) => {
                AssetTypeRowRepository::new(con).batch_upsert(concrete!(AssetCatalogueType))
            }
            // TODO add them all
            _ => {
                unreachable!("variant without batch upsert should have been filtered out by caller")
            }
        };

        match result {
            Ok(_) => (taken, None),
            Err(e) => (taken, Some(e)),
        }
    }

    /// Bind-parameter count per row for batching, or 0 if the variant's repo isn't wired up
    /// with `define_batch_table!` (caller should treat 0 as "not batchable, no chunk limit").
    pub fn number_of_columns(&self) -> usize {
        match self {
            Row::Unit(_) => UnitRow::BATCH_COLUMN_COUNT,
            Row::ActivityLog(_) => ActivityLogRow::BATCH_COLUMN_COUNT,
            Row::Clinician(_) => ClinicianRow::BATCH_COLUMN_COUNT,
            Row::ClinicianStoreJoin(_) => ClinicianStoreJoinRow::BATCH_COLUMN_COUNT,
            Row::Currency(_) => CurrencyRow::BATCH_COLUMN_COUNT,
            Row::InsuranceProvider(_) => InsuranceProviderRow::BATCH_COLUMN_COUNT,
            Row::Location(_) => LocationRow::BATCH_COLUMN_COUNT,
            Row::LocationMovement(_) => LocationMovementRow::BATCH_COLUMN_COUNT,
            Row::Sensor(_) => SensorRow::BATCH_COLUMN_COUNT,
            Row::Stocktake(_) => StocktakeRow::BATCH_COLUMN_COUNT,
            Row::TemperatureBreach(_) => TemperatureBreachRow::BATCH_COLUMN_COUNT,
            Row::TemperatureLog(_) => TemperatureLogRow::BATCH_COLUMN_COUNT,
            Row::VVMStatusLog(_) => VVMStatusLogRow::BATCH_COLUMN_COUNT,
            Row::RequisitionLine(_) => RequisitionLineRow::BATCH_COLUMN_COUNT,
            Row::AssetCatalogueItem(_) => AssetCatalogueItemRow::BATCH_COLUMN_COUNT,
            Row::AssetCategory(_) => AssetCategoryRow::BATCH_COLUMN_COUNT,
            Row::AssetClass(_) => AssetClassRow::BATCH_COLUMN_COUNT,
            Row::AssetLogReason(_) => AssetLogReasonRow::BATCH_COLUMN_COUNT,
            Row::AssetProperty(_) => AssetPropertyRow::BATCH_COLUMN_COUNT,
            Row::BackendPlugin(_) => BackendPluginRow::BATCH_COLUMN_COUNT,
            Row::BundledItem(_) => BundledItemRow::BATCH_COLUMN_COUNT,
            Row::Campaign(_) => CampaignRow::BATCH_COLUMN_COUNT,
            Row::Demographic(_) => DemographicRow::BATCH_COLUMN_COUNT,
            Row::FormSchema(_) => FormSchemaRow::BATCH_COLUMN_COUNT,
            Row::FrontendPlugin(_) => FrontendPluginRow::BATCH_COLUMN_COUNT,
            Row::NameProperty(_) => NamePropertyRow::BATCH_COLUMN_COUNT,
            Row::PackagingVariant(_) => PackagingVariantRow::BATCH_COLUMN_COUNT,
            Row::Property(_) => PropertyRow::BATCH_COLUMN_COUNT,
            Row::Report(_) => ReportRow::BATCH_COLUMN_COUNT,
            Row::VaccineCourse(_) => VaccineCourseRow::BATCH_COLUMN_COUNT,
            Row::VaccineCourseDose(_) => VaccineCourseDoseRow::BATCH_COLUMN_COUNT,
            Row::VaccineCourseItem(_) => VaccineCourseItemRow::BATCH_COLUMN_COUNT,
            Row::VaccineCourseStoreConfig(_) => VaccineCourseStoreConfigRow::BATCH_COLUMN_COUNT,
            Row::LocationType(_) => LocationTypeRow::BATCH_COLUMN_COUNT,
            Row::MasterList(_) => MasterListRow::BATCH_COLUMN_COUNT,
            Row::Asset(_) => AssetRow::BATCH_COLUMN_COUNT,
            Row::AssetInternalLocation(_) => AssetInternalLocationRow::BATCH_COLUMN_COUNT,
            Row::RnrFormLine(_) => RnRFormLineRow::BATCH_COLUMN_COUNT,
            Row::SyncMessage(_) => SyncMessageRow::BATCH_COLUMN_COUNT,
            Row::SyncFileReference(_) => SyncFileReferenceRow::BATCH_COLUMN_COUNT,
            Row::PluginData(_) => PluginDataRow::BATCH_COLUMN_COUNT,
            Row::Preference(_) => PreferenceRow::BATCH_COLUMN_COUNT,
            Row::ContactForm(_) => ContactFormRow::BATCH_COLUMN_COUNT,
            Row::SystemLog(_) => SystemLogRow::BATCH_COLUMN_COUNT,
            Row::Abbreviation(_) => AbbreviationRow::BATCH_COLUMN_COUNT,
            Row::Category(_) => CategoryRow::BATCH_COLUMN_COUNT,
            Row::Context(_) => ContextRow::BATCH_COLUMN_COUNT,
            Row::DemographicIndicator(_) => DemographicIndicatorRow::BATCH_COLUMN_COUNT,
            Row::Diagnosis(_) => DiagnosisRow::BATCH_COLUMN_COUNT,
            Row::DocumentRegistry(_) => DocumentRegistryRow::BATCH_COLUMN_COUNT,
            Row::IndicatorColumn(_) => IndicatorColumnRow::BATCH_COLUMN_COUNT,
            Row::IndicatorLine(_) => IndicatorLineRow::BATCH_COLUMN_COUNT,
            Row::ItemCategoryJoin(_) => ItemCategoryJoinRow::BATCH_COLUMN_COUNT,
            Row::ItemDirection(_) => ItemDirectionRow::BATCH_COLUMN_COUNT,
            Row::ItemStoreJoin(_) => ItemStoreJoinRow::BATCH_COLUMN_COUNT,
            Row::ItemWarningJoin(_) => ItemWarningJoinRow::BATCH_COLUMN_COUNT,
            Row::MasterListLine(_) => MasterListLineRow::BATCH_COLUMN_COUNT,
            Row::NameTag(_) => NameTagRow::BATCH_COLUMN_COUNT,
            Row::Period(_) => PeriodRow::BATCH_COLUMN_COUNT,
            Row::PeriodSchedule(_) => PeriodScheduleRow::BATCH_COLUMN_COUNT,
            Row::Printer(_) => PrinterRow::BATCH_COLUMN_COUNT,
            Row::Program(_) => ProgramRow::BATCH_COLUMN_COUNT,
            Row::ProgramIndicator(_) => ProgramIndicatorRow::BATCH_COLUMN_COUNT,
            Row::ProgramRequisitionOrderType(_) => {
                ProgramRequisitionOrderTypeRow::BATCH_COLUMN_COUNT
            }
            Row::ProgramRequisitionSettings(_) => ProgramRequisitionSettingsRow::BATCH_COLUMN_COUNT,
            Row::ReasonOption(_) => ReasonOptionRow::BATCH_COLUMN_COUNT,
            Row::ShippingMethod(_) => ShippingMethodRow::BATCH_COLUMN_COUNT,
            Row::StorePreference(_) => StorePreferenceRow::BATCH_COLUMN_COUNT,
            Row::UserAccount(_) => UserAccountRow::BATCH_COLUMN_COUNT,
            Row::UserPermission(_) => UserPermissionRow::BATCH_COLUMN_COUNT,
            Row::UserStoreJoin(_) => UserStoreJoinRow::BATCH_COLUMN_COUNT,
            Row::VVMStatus(_) => VVMStatusRow::BATCH_COLUMN_COUNT,
            Row::AssetCatalogueType(_) => AssetTypeRow::BATCH_COLUMN_COUNT,
            _ => 0,
        }
    }

    /// Build the changelog row(s) for this row. A `Vec` to allow multi-changelog
    /// rows (purchase order line also emits a changelog for its parent). The row is
    /// in hand, so no re-query is needed.
    pub fn generate_changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteId,
    ) -> Result<Vec<ChangeLogInsertRow>, RepositoryError> {
        if let Row::PurchaseOrderLine(r) = self {
            let Changelogs {
                purchase_order_changelog,
                purchase_order_line_changelog,
            } = PurchaseOrderLineRow::generate_changelogs(
                RowOrId::Row(r),
                con,
                action,
                source_site_id,
            )?;
            return Ok(vec![
                purchase_order_line_changelog,
                purchase_order_changelog,
            ]);
        }

        // Single-changelog: every other variant produces exactly one changelog for itself.
        let single_log = match self {
            // Handled by the early return above; listed so this match stays exhaustive.
            Row::PurchaseOrderLine(_) => unreachable!("handled by early return above"),
            Row::ActivityLog(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::Barcode(r) => {
                BarcodeRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Clinician(r) => {
                ClinicianRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ClinicianStoreJoin(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::Currency(r) => {
                CurrencyRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Document(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::IndicatorValue(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::InsuranceProvider(r) => {
                InsuranceProviderRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Item(r) => ItemRow::generate_changelog(r.id.clone(), con, action, source_site_id)?,
            Row::Location(r) => {
                LocationRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::LocationMovement(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::Name(r) => {
                NameRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::NameInsuranceJoin(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::NameStoreJoin(r) => {
                NameStoreJoinRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::PurchaseOrder(r) => {
                PurchaseOrderRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::Sensor(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::StockLine(r) => {
                StockLineRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::Stocktake(r) => {
                StocktakeRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::StocktakeLine(r) => {
                StocktakeLineRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::TemperatureBreach(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::TemperatureLog(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::VVMStatusLog(r) => {
                VVMStatusLogRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::Requisition(r) => {
                RequisitionRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::RequisitionLine(r) => RequisitionLineRow::generate_changelog(
                RowOrId::Row(r),
                con,
                action,
                source_site_id,
            )?,
            Row::Invoice(r) => {
                InvoiceRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::InvoiceLine(r) => {
                InvoiceLineRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::AssetCatalogueItem(r) => AssetCatalogueItemRow::generate_changelog(
                r.id.clone(),
                con,
                action,
                source_site_id,
            )?,
            Row::AssetCategory(r) => {
                AssetCategoryRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::AssetClass(r) => {
                AssetClassRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::AssetLogReason(r) => {
                AssetLogReasonRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::AssetProperty(r) => {
                AssetPropertyRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::AncillaryItem(r) => {
                AncillaryItemRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::BundledItem(r) => {
                BundledItemRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Campaign(r) => {
                CampaignRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Demographic(r) => {
                DemographicRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ItemVariant(r) => {
                ItemVariantRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::NameProperty(r) => {
                NamePropertyRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::PackagingVariant(r) => {
                PackagingVariantRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Property(r) => {
                PropertyRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Report(r) => {
                ReportRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::VaccineCourse(r) => {
                VaccineCourseRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::VaccineCourseDose(r) => {
                VaccineCourseDoseRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::VaccineCourseItem(r) => {
                VaccineCourseItemRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::VaccineCourseStoreConfig(r) => {
                r.generate_changelog(con, action, source_site_id)?
            }
            Row::LocationType(r) => {
                LocationTypeRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::MasterList(r) => {
                MasterListRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Store(r) => {
                StoreRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Unit(r) => UnitRow::generate_changelog(r.id.clone(), con, action, source_site_id)?,
            Row::Asset(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::AssetInternalLocation(r) => AssetInternalLocationRow::generate_changelog(
                RowOrId::Row(r),
                con,
                action,
                source_site_id,
            )?,
            Row::AssetLog(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::Encounter(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::RnrForm(r) => {
                RnRFormRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::RnrFormLine(r) => {
                RnRFormLineRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::Vaccination(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::SyncFileReference(r) => {
                SyncFileReferenceRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::PluginData(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::Preference(r) => {
                PreferenceRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::ContactForm(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::SystemLog(r) => {
                SystemLogRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Abbreviation(r) => {
                AbbreviationRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Category(r) => {
                CategoryRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Contact(r) => {
                ContactRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Context(r) => {
                ContextRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::DemographicIndicator(r) => DemographicIndicatorRow::generate_changelog(
                r.id.clone(),
                con,
                action,
                source_site_id,
            )?,
            Row::Diagnosis(r) => {
                DiagnosisRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::DocumentRegistry(r) => {
                DocumentRegistryRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::IndicatorColumn(r) => {
                IndicatorColumnRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::IndicatorLine(r) => {
                IndicatorLineRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ItemCategoryJoin(r) => {
                ItemCategoryJoinRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ItemDirection(r) => {
                ItemDirectionRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ItemStoreJoin(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::ItemWarningJoin(r) => {
                ItemWarningJoinRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::MasterListLine(r) => {
                MasterListLineRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::MasterListNameJoin(r) => MasterListNameJoinRow::generate_changelog(
                r.id.clone(),
                con,
                action,
                source_site_id,
            )?,
            Row::NameTag(r) => {
                NameTagRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::NameTagJoin(r) => {
                NameTagJoinRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Period(r) => {
                PeriodRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::PeriodSchedule(r) => {
                PeriodScheduleRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Printer(r) => {
                PrinterRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Program(r) => {
                ProgramRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ProgramEnrolment(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::ProgramEvent(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::ProgramIndicator(r) => {
                ProgramIndicatorRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ProgramRequisitionOrderType(r) => {
                ProgramRequisitionOrderTypeRow::generate_changelog(
                    r.id.clone(),
                    con,
                    action,
                    source_site_id,
                )?
            }
            Row::ProgramRequisitionSettings(r) => {
                ProgramRequisitionSettingsRow::generate_changelog(
                    r.id.clone(),
                    con,
                    action,
                    source_site_id,
                )?
            }
            Row::ReasonOption(r) => {
                ReasonOptionRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::ShippingMethod(r) => {
                ShippingMethodRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::StorePreference(r) => {
                StorePreferenceRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::UserAccount(r) => {
                UserAccountRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::UserPermission(r) => {
                UserPermissionRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::UserStoreJoin(r) => {
                UserStoreJoinRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::VVMStatus(r) => {
                VVMStatusRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::AssetCatalogueType(r) => {
                AssetTypeRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::BackendPlugin(r) => {
                BackendPluginRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::FormSchema(r) => {
                FormSchemaJson::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::FrontendPlugin(r) => {
                FrontendPluginRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::SyncMessage(r) => {
                SyncMessageRow::generate_changelog(RowOrId::Row(r), con, action, source_site_id)?
            }
            Row::ContactTrace(r) => r.generate_changelog(con, action, source_site_id)?,
            Row::NameOmsFields(r) => {
                NameOmsFieldsRow::generate_changelog(r.id.clone(), con, action, source_site_id)?
            }
            Row::Site(r) => {
                SiteRow::generate_changelog(r.id.to_string(), con, action, source_site_id)?
            }
        };
        Ok(vec![single_log])
    }
}

/// Outcome of `integrate_delete_no_changelog`: whether the table had a delete path.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeleteOutcome {
    /// The row was deleted (row only, no changelog).
    Deleted,
    /// The table is not synced out on delete, so nothing was deleted. Callers that
    /// require a delete (v7) treat this as "delete translator not found".
    NoDeletePath,
}

/// Delete a row by identity (row only, no changelog), dispatched by table. Returns
/// `NoDeletePath` (not an error) for tables that are never deleted via sync.
/// TODO remove once all tables are listed in batch_delete
pub fn integrate_delete_no_changelog(
    con: &StorageConnection,
    table_name: &ChangelogTableName,
    record_id: &str,
) -> Result<DeleteOutcome, RepositoryError> {
    match table_name {
        ChangelogTableName::Abbreviation => {
            AbbreviationRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::ActivityLog => {
            ActivityLogRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Asset => AssetRowRepository::new(con).delete_no_changelog(record_id)?,
        ChangelogTableName::AssetInternalLocation => {
            AssetInternalLocationRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::BackendPlugin => {
            BackendPluginRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Category => {
            CategoryRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::ClinicianStoreJoin => {
            ClinicianStoreJoinRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Contact => {
            ContactRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Currency => {
            CurrencyRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Diagnosis => {
            DiagnosisRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::FormSchema => {
            FormSchemaRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::FrontendPlugin => {
            FrontendPluginRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::IndicatorValue => {
            IndicatorValueRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Invoice => {
            InvoiceRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::InvoiceLine => {
            InvoiceLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Item => ItemRowRepository::new(con).delete_no_changelog(record_id)?,
        ChangelogTableName::ItemDirection => {
            ItemDirectionRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Location => {
            LocationRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::MasterListLine => {
            MasterListLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::MasterListNameJoin => {
            MasterListNameJoinRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Name => NameRowRepository::new(con).delete_no_changelog(record_id)?,
        ChangelogTableName::NameStoreJoin => {
            NameStoreJoinRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::NameTag => {
            NameTagRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::NameTagJoin => {
            NameTagJoinRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Preference => {
            PreferenceRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Program => {
            ProgramRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::ProgramRequisitionOrderType => {
            ProgramRequisitionOrderTypeRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::ProgramRequisitionSettings => {
            ProgramRequisitionSettingsRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::PurchaseOrder => {
            PurchaseOrderRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::PurchaseOrderLine => {
            PurchaseOrderLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Report => {
            ReportRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Requisition => {
            RequisitionRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::RequisitionLine => {
            RequisitionLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::RnrForm => {
            RnRFormRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::RnrFormLine => {
            RnRFormLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Sensor => {
            SensorRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Site => SiteRowRepository::new(con).delete_no_changelog(record_id)?,
        ChangelogTableName::StockLine => {
            StockLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Stocktake => {
            StocktakeRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::StocktakeLine => {
            StocktakeLineRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::Unit => UnitRowRepository::new(con).delete_no_changelog(record_id)?,
        ChangelogTableName::UserAccount => {
            UserAccountRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::UserPermission => {
            UserPermissionRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::UserStoreJoin => {
            UserStoreJoinRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::ReasonOption => {
            ReasonOptionRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::VVMStatus => {
            VVMStatusRowRepository::new(con).delete_no_changelog(record_id)?
        }
        ChangelogTableName::VVMStatusLog => {
            VVMStatusLogRowRepository::new(con).delete_no_changelog(record_id)?
        }
        // Table has no delete path (not synced out on delete). Signal to the caller
        // rather than erroring — v7 maps this to "delete translator not found".
        _ => return Ok(DeleteOutcome::NoDeletePath),
    }
    Ok(DeleteOutcome::Deleted)
}

impl Row {
    pub fn batch_delete(
        con: &StorageConnection,
        table_name: &ChangelogTableName,
        record_ids: &[&str],
    ) -> Result<DeleteOutcome, RepositoryError> {
        match table_name {
            // Tables wired up with a real set-based delete.
            ChangelogTableName::Unit => UnitRowRepository::new(con)._batch_delete(record_ids)?,
            // Everything else: per-id (preserves soft/hard/Site/no-op semantics exactly).
            _ => return Ok(DeleteOutcome::NoDeletePath),
        };

        Ok(DeleteOutcome::Deleted)
    }
}
/// Build the changelog row(s) to record a delete of `record_id` in `table_name`,
/// for the v5/v6 integration path. MUST be called BEFORE the row is deleted, because
/// store-scoped tables read the row's `store_id`/`transfer_store_id`/`patient_id` to
/// route the changelog. Returns an empty Vec for tables not synced out on delete
/// (link tables, append-only logs). Replicates the old per-type `Delete::delete_sync`
/// changelog branch exactly (note: soft-deleted tables emit `Upsert`, not `Delete`).
pub fn generate_delete_changelog(
    con: &StorageConnection,
    table_name: &ChangelogTableName,
    record_id: &str,
    source_site_id: SourceSiteId,
) -> Result<Vec<ChangeLogInsertRow>, RepositoryError> {
    let changelogs = match table_name {
        ChangelogTableName::Abbreviation => vec![AbbreviationRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::ActivityLog => vec![],
        ChangelogTableName::Asset => vec![AssetRowRepository::new(con)
            .find_one_by_id(record_id)?
            .ok_or(RepositoryError::NotFound)?
            .generate_changelog(con, RowActionType::Upsert, source_site_id)?],
        ChangelogTableName::AssetInternalLocation => {
            vec![AssetInternalLocationRow::generate_changelog(
                RowOrId::Id(record_id),
                con,
                RowActionType::Delete,
                source_site_id,
            )?]
        }
        ChangelogTableName::BackendPlugin => vec![BackendPluginRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Category => vec![CategoryRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::ClinicianStoreJoin => vec![],
        ChangelogTableName::Contact => vec![ContactRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Currency => vec![CurrencyRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::Diagnosis => vec![DiagnosisRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::FormSchema => vec![FormSchemaJson::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::FrontendPlugin => vec![FrontendPluginRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::IndicatorValue => vec![IndicatorValueRowRepository::new(con)
            .find_one_by_id(record_id)?
            .ok_or(RepositoryError::NotFound)?
            .generate_changelog(con, RowActionType::Delete, source_site_id)?],
        ChangelogTableName::Invoice => vec![InvoiceRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::InvoiceLine => vec![InvoiceLineRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Item => vec![ItemRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::ItemDirection => vec![ItemDirectionRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Location => vec![LocationRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::MasterListLine => vec![MasterListLineRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::MasterListNameJoin => vec![MasterListNameJoinRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Name => vec![NameRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::NameStoreJoin => vec![NameStoreJoinRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::NameTag => vec![NameTagRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::NameTagJoin => vec![NameTagJoinRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Preference => vec![PreferenceRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Program => vec![ProgramRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::ProgramRequisitionOrderType => {
            vec![ProgramRequisitionOrderTypeRow::generate_changelog(
                record_id.to_string(),
                con,
                RowActionType::Delete,
                source_site_id,
            )?]
        }
        ChangelogTableName::ProgramRequisitionSettings => {
            vec![ProgramRequisitionSettingsRow::generate_changelog(
                record_id.to_string(),
                con,
                RowActionType::Delete,
                source_site_id,
            )?]
        }
        ChangelogTableName::PurchaseOrder => vec![PurchaseOrderRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::PurchaseOrderLine => vec![
            PurchaseOrderLineRow::generate_changelogs(
                RowOrId::Id(record_id),
                con,
                RowActionType::Delete,
                source_site_id,
            )?
            .purchase_order_line_changelog,
        ],
        ChangelogTableName::ReasonOption => vec![ReasonOptionRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::Report => vec![ReportRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Requisition => vec![RequisitionRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::RequisitionLine => vec![RequisitionLineRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::RnrForm => vec![RnRFormRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::RnrFormLine => vec![RnRFormLineRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Sensor => vec![SensorRowRepository::new(con)
            .find_one_by_id(record_id)?
            .ok_or(RepositoryError::NotFound)?
            .generate_changelog(con, RowActionType::Upsert, source_site_id)?],
        ChangelogTableName::Site => {
            match SiteRowRepository::new(con).find_one_by_og_id(record_id)? {
                Some(site) => vec![SiteRow::generate_changelog(
                    site.id.to_string(),
                    con,
                    RowActionType::Delete,
                    source_site_id,
                )?],
                None => vec![],
            }
        }
        ChangelogTableName::StockLine => vec![StockLineRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Stocktake => vec![StocktakeRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::StocktakeLine => vec![StocktakeLineRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::Unit => vec![UnitRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Upsert,
            source_site_id,
        )?],
        ChangelogTableName::UserAccount => vec![UserAccountRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::UserPermission => vec![UserPermissionRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::UserStoreJoin => vec![UserStoreJoinRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::VVMStatus => vec![VVMStatusRow::generate_changelog(
            record_id.to_string(),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        ChangelogTableName::VVMStatusLog => vec![VVMStatusLogRow::generate_changelog(
            RowOrId::Id(record_id),
            con,
            RowActionType::Delete,
            source_site_id,
        )?],
        // Tables not synced out on delete (no per-type delete changelog historically).
        _ => vec![],
    };
    Ok(changelogs)
}
