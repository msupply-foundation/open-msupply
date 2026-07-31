use repository::{
    category_row::CategoryRow, contact_trace_row::ContactTraceRow,
    item_category_row::ItemCategoryJoinRow, sync_file_reference_row::SyncFileReferenceWire,
    syncv7::SyncRecordSerializeError, *,
};
use serde::de::DeserializeOwned;

use crate::sync_v7::{
    translations::{
        invoice_line::translate_invoice_line, store::translate_store,
        sync_file_reference::translate_sync_file_reference,
        temperature_log::translate_temperature_log,
    },
    validate_translate_integrate::{create_changelog, SyncContext},
};

fn from_value<T: DeserializeOwned + Upsert + 'static>(
    data: &serde_json::Value,
) -> Result<Box<dyn Upsert>, SyncRecordSerializeError> {
    serde_json::from_value::<T>(data.clone())
        .map(|r| Box::new(r) as Box<dyn Upsert>)
        .map_err(|e| SyncRecordSerializeError::SerdeError(e.to_string()))
}

pub fn serialize(row: &Row) -> Result<serde_json::Value, SyncRecordSerializeError> {
    let map_serde_err = |e: serde_json::Error| SyncRecordSerializeError::SerdeError(e.to_string());

    match row {
        Row::Unit(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Currency(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Name(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Store(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::LocationType(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Item(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::StockLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Invoice(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::InvoiceLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ActivityLog(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Barcode(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Clinician(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ClinicianStoreJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Document(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::IndicatorValue(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::InsuranceProvider(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Location(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::LocationMovement(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::NameInsuranceJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::NameStoreJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::PurchaseOrder(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::PurchaseOrderLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Sensor(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Stocktake(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::StocktakeLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::TemperatureBreach(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::TemperatureLog(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::VVMStatusLog(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Requisition(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::RequisitionLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetCatalogueItem(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetCategory(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetClass(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetLogReason(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetProperty(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::BackendPlugin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AncillaryItem(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::BundledItem(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Campaign(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Demographic(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::HelpDocument(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::FormSchema(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::FrontendPlugin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ItemVariant(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::NameProperty(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::PackagingVariant(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Property(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::CustomField(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::CustomFieldOption(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::CustomFieldScope(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Report(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::VaccineCourse(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::VaccineCourseDose(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::VaccineCourseItem(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::VaccineCourseStoreConfig(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::MasterList(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Asset(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetInternalLocation(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetLog(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Encounter(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::RnrForm(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::RnrFormLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::SyncMessage(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Vaccination(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::StockRelocation(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::StockRelocationLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        // Wire type, not the row: carries status/error across sites (row serde skips them)
        // while local-only bookkeeping (direction, retries, transfer progress) stays put.
        Row::SyncFileReference(r) => {
            serde_json::to_value(SyncFileReferenceWire::from_row(r)).map_err(map_serde_err)
        }
        Row::PluginData(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Preference(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ContactForm(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::SystemLog(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Abbreviation(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Category(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Contact(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ContactTrace(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Context(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::DemographicIndicator(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Diagnosis(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::DocumentRegistry(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::IndicatorColumn(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::IndicatorLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ItemCategoryJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ItemDirection(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ItemStoreJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ItemWarningJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::MasterListLine(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::MasterListNameJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::NameTag(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::NameTagJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Period(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::PeriodSchedule(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Printer(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Program(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ProgramEnrolment(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ProgramEvent(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ProgramIndicator(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ProgramRequisitionOrderType(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ProgramRequisitionSettings(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ReasonOption(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::ShippingMethod(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::StorePreference(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::UserAccount(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::UserPermission(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::UserStoreJoin(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::VVMStatus(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::NameOmsFields(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::Site(r) => serde_json::to_value(r).map_err(map_serde_err),
        Row::AssetCatalogueType(r) => serde_json::to_value(r).map_err(map_serde_err),
    }
}

pub(crate) type DeserializeResult =
    Result<Vec<(Box<dyn Upsert>, ChangeLogInsertRow)>, SyncRecordSerializeError>;

pub(crate) fn deserialize(
    connection: &StorageConnection,
    table_name: &ChangelogTableName,
    row: &SyncBufferRow,
    sync_context: &SyncContext,
) -> DeserializeResult {
    let changelog_insert = create_changelog(table_name.clone(), RowActionType::Upsert, row);
    let data = &row.data;
    let upsert = match table_name {
        // Special
        ChangelogTableName::Store => return translate_store(connection, changelog_insert, data),
        ChangelogTableName::SyncFileReference => {
            return translate_sync_file_reference(connection, changelog_insert, data)
        }
        ChangelogTableName::InvoiceLine => {
            return translate_invoice_line(
                changelog_insert,
                row.store_id.as_deref(),
                data,
                sync_context,
            )
        }
        ChangelogTableName::TemperatureLog => {
            return translate_temperature_log(connection, changelog_insert, data)
        }
        // Basic
        ChangelogTableName::Unit => from_value::<UnitRow>(data),
        ChangelogTableName::Currency => from_value::<CurrencyRow>(data),
        ChangelogTableName::Name => from_value::<NameRow>(data),
        ChangelogTableName::LocationType => from_value::<LocationTypeRow>(data),
        ChangelogTableName::Item => from_value::<ItemRow>(data),
        ChangelogTableName::StockLine => from_value::<StockLineRow>(data),
        ChangelogTableName::StockRelocation => from_value::<StockRelocationRow>(data),
        ChangelogTableName::StockRelocationLine => from_value::<StockRelocationLineRow>(data),
        ChangelogTableName::Invoice => from_value::<InvoiceRow>(data),
        ChangelogTableName::ActivityLog => from_value::<ActivityLogRow>(data),
        ChangelogTableName::Barcode => from_value::<BarcodeRow>(data),
        ChangelogTableName::Clinician => from_value::<ClinicianRow>(data),
        ChangelogTableName::ClinicianStoreJoin => from_value::<ClinicianStoreJoinRow>(data),
        ChangelogTableName::Document => from_value::<DocumentRow>(data),
        ChangelogTableName::IndicatorValue => from_value::<IndicatorValueRow>(data),
        ChangelogTableName::InsuranceProvider => from_value::<InsuranceProviderRow>(data),
        ChangelogTableName::Location => from_value::<LocationRow>(data),
        ChangelogTableName::LocationMovement => from_value::<LocationMovementRow>(data),
        ChangelogTableName::NameInsuranceJoin => from_value::<NameInsuranceJoinRow>(data),
        ChangelogTableName::NameStoreJoin => from_value::<NameStoreJoinRow>(data),
        ChangelogTableName::PurchaseOrder => from_value::<PurchaseOrderRow>(data),
        ChangelogTableName::PurchaseOrderLine => from_value::<PurchaseOrderLineRow>(data),
        ChangelogTableName::Sensor => from_value::<SensorRow>(data),
        ChangelogTableName::Stocktake => from_value::<StocktakeRow>(data),
        ChangelogTableName::StocktakeLine => from_value::<StocktakeLineRow>(data),
        ChangelogTableName::TemperatureBreach => from_value::<TemperatureBreachRow>(data),
        ChangelogTableName::VVMStatusLog => from_value::<VVMStatusLogRow>(data),
        ChangelogTableName::Requisition => from_value::<RequisitionRow>(data),
        ChangelogTableName::RequisitionLine => from_value::<RequisitionLineRow>(data),
        ChangelogTableName::AssetCatalogueItem => from_value::<AssetCatalogueItemRow>(data),
        ChangelogTableName::AssetCatalogueType => from_value::<AssetTypeRow>(data),
        ChangelogTableName::AssetCategory => from_value::<AssetCategoryRow>(data),
        ChangelogTableName::AssetClass => from_value::<AssetClassRow>(data),
        ChangelogTableName::AssetLogReason => from_value::<AssetLogReasonRow>(data),
        ChangelogTableName::AssetProperty => from_value::<AssetPropertyRow>(data),
        ChangelogTableName::BackendPlugin => from_value::<BackendPluginRow>(data),
        ChangelogTableName::AncillaryItem => from_value::<AncillaryItemRow>(data),
        ChangelogTableName::BundledItem => from_value::<BundledItemRow>(data),
        ChangelogTableName::Campaign => from_value::<CampaignRow>(data),
        ChangelogTableName::Demographic => from_value::<DemographicRow>(data),
        ChangelogTableName::HelpDocument => from_value::<HelpDocumentRow>(data),
        ChangelogTableName::FormSchema => from_value::<FormSchemaRow>(data),
        ChangelogTableName::FrontendPlugin => from_value::<FrontendPluginRow>(data),
        ChangelogTableName::ItemVariant => from_value::<ItemVariantRow>(data),
        ChangelogTableName::NameOmsFields => from_value::<NameOmsFieldsRow>(data),
        ChangelogTableName::NameProperty => from_value::<NamePropertyRow>(data),
        ChangelogTableName::PackagingVariant => from_value::<PackagingVariantRow>(data),
        ChangelogTableName::Property => from_value::<PropertyRow>(data),
        ChangelogTableName::CustomField => from_value::<CustomFieldRow>(data),
        ChangelogTableName::CustomFieldOption => from_value::<CustomFieldOptionRow>(data),
        ChangelogTableName::CustomFieldScope => from_value::<CustomFieldScopeRow>(data),
        ChangelogTableName::Report => from_value::<ReportRow>(data),
        ChangelogTableName::VaccineCourse => from_value::<VaccineCourseRow>(data),
        ChangelogTableName::VaccineCourseDose => from_value::<VaccineCourseDoseRow>(data),
        ChangelogTableName::VaccineCourseItem => from_value::<VaccineCourseItemRow>(data),
        ChangelogTableName::VaccineCourseStoreConfig => {
            from_value::<VaccineCourseStoreConfigRow>(data)
        }
        ChangelogTableName::Abbreviation => from_value::<AbbreviationRow>(data),
        ChangelogTableName::Category => from_value::<CategoryRow>(data),
        ChangelogTableName::Contact => from_value::<ContactRow>(data),
        ChangelogTableName::ContactTrace => from_value::<ContactTraceRow>(data),
        ChangelogTableName::Context => from_value::<ContextRow>(data),
        ChangelogTableName::DemographicIndicator => from_value::<DemographicIndicatorRow>(data),
        ChangelogTableName::Diagnosis => from_value::<DiagnosisRow>(data),
        ChangelogTableName::DocumentRegistry => from_value::<DocumentRegistryRow>(data),
        ChangelogTableName::IndicatorColumn => from_value::<IndicatorColumnRow>(data),
        ChangelogTableName::IndicatorLine => from_value::<IndicatorLineRow>(data),
        ChangelogTableName::ItemCategoryJoin => from_value::<ItemCategoryJoinRow>(data),
        ChangelogTableName::ItemDirection => from_value::<ItemDirectionRow>(data),
        ChangelogTableName::ItemStoreJoin => from_value::<ItemStoreJoinRow>(data),
        ChangelogTableName::ItemWarningJoin => from_value::<ItemWarningJoinRow>(data),
        ChangelogTableName::MasterList => from_value::<MasterListRow>(data),
        ChangelogTableName::MasterListLine => from_value::<MasterListLineRow>(data),
        ChangelogTableName::MasterListNameJoin => from_value::<MasterListNameJoinRow>(data),
        ChangelogTableName::NameTag => from_value::<NameTagRow>(data),
        ChangelogTableName::NameTagJoin => from_value::<NameTagJoinRow>(data),
        ChangelogTableName::Period => from_value::<PeriodRow>(data),
        ChangelogTableName::PeriodSchedule => from_value::<PeriodScheduleRow>(data),
        ChangelogTableName::Printer => from_value::<PrinterRow>(data),
        ChangelogTableName::Program => from_value::<ProgramRow>(data),
        ChangelogTableName::ProgramEnrolment => from_value::<ProgramEnrolmentRow>(data),
        ChangelogTableName::ProgramEvent => from_value::<ProgramEventRow>(data),
        ChangelogTableName::ProgramIndicator => from_value::<ProgramIndicatorRow>(data),
        ChangelogTableName::ProgramRequisitionOrderType => {
            from_value::<ProgramRequisitionOrderTypeRow>(data)
        }
        ChangelogTableName::ProgramRequisitionSettings => {
            from_value::<ProgramRequisitionSettingsRow>(data)
        }
        ChangelogTableName::ReasonOption => from_value::<ReasonOptionRow>(data),
        ChangelogTableName::ShippingMethod => from_value::<ShippingMethodRow>(data),
        ChangelogTableName::StorePreference => from_value::<StorePreferenceRow>(data),
        ChangelogTableName::UserAccount => from_value::<UserAccountRow>(data),
        ChangelogTableName::UserPermission => from_value::<UserPermissionRow>(data),
        ChangelogTableName::UserStoreJoin => from_value::<UserStoreJoinRow>(data),
        ChangelogTableName::VVMStatus => from_value::<VVMStatusRow>(data),
        ChangelogTableName::Site => from_value::<SiteRow>(data),
        ChangelogTableName::Asset => from_value::<AssetRow>(data),
        ChangelogTableName::AssetInternalLocation => from_value::<AssetInternalLocationRow>(data),
        ChangelogTableName::AssetLog => from_value::<AssetLogRow>(data),
        ChangelogTableName::Encounter => from_value::<EncounterRow>(data),
        ChangelogTableName::RnrForm => from_value::<RnRFormRow>(data),
        ChangelogTableName::RnrFormLine => from_value::<RnRFormLineRow>(data),
        ChangelogTableName::SyncMessage => from_value::<SyncMessageRow>(data),
        ChangelogTableName::Vaccination => from_value::<VaccinationRow>(data),
        ChangelogTableName::PluginData => from_value::<PluginDataRow>(data),
        ChangelogTableName::Preference => from_value::<PreferenceRow>(data),
        ChangelogTableName::ContactForm => from_value::<ContactFormRow>(data),
        ChangelogTableName::SystemLog => from_value::<SystemLogRow>(data),
        // A table this site doesn't recognise (e.g. added on a newer central). There is
        // no row type to deserialize into. In practice such records never reach here —
        // they aren't part of `INTEGRATION_ORDER`, so they stay unintegrated in the sync
        // buffer — but return an error rather than silently succeeding if one does.
        ChangelogTableName::Other(unknown) => {
            return Err(SyncRecordSerializeError::SerdeError(format!(
                "No translator for unrecognised table `{unknown}`"
            )))
        }
    }?;

    Ok(vec![(upsert, changelog_insert)])
}
