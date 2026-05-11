use std::collections::HashMap;

use crate::*;
// Types only reachable via their full submodule path (no flat re-export).
use crate::{
    category_row::{CategoryRow, CategoryRowRepository},
    contact_trace_row::{ContactTraceRow, ContactTraceRowRepository},
    item_category_row::{ItemCategoryJoinRow, ItemCategoryJoinRowRepository},
};

/// Max ids per IN-clause when batch-fetching rows; keeps us well below
/// SQLite's default 999-parameter limit and groups queries efficiently.
const ROW_FETCH_BATCH_SIZE: usize = 500;

/// One of the row variants that can appear in a changelog. Generated
/// to cover every push-translated `ChangelogTableName`. Tables not in
/// this enum trigger `unimplemented!()` in `fetch_rows_for_table`.
#[derive(Debug, Clone)]
pub enum Row {
    ActivityLog(ActivityLogRow),
    Barcode(BarcodeRow),
    Clinician(ClinicianRow),
    ClinicianStoreJoin(ClinicianStoreJoinRow),
    Currency(CurrencyRow),
    Document(DocumentRow),
    IndicatorValue(IndicatorValueRow),
    InsuranceProvider(InsuranceProviderRow),
    Item(ItemRow),
    Location(LocationRow),
    LocationMovement(LocationMovementRow),
    Name(NameRow),
    NameInsuranceJoin(NameInsuranceJoinRow),
    NameStoreJoin(NameStoreJoinRow),
    PurchaseOrder(PurchaseOrderRow),
    PurchaseOrderLine(PurchaseOrderLineRow),
    Sensor(SensorRow),
    StockLine(StockLineRow),
    Stocktake(StocktakeRow),
    StocktakeLine(StocktakeLineRow),
    TemperatureBreach(TemperatureBreachRow),
    TemperatureLog(TemperatureLogRow),
    VVMStatusLog(VVMStatusLogRow),
    Requisition(RequisitionRow),
    RequisitionLine(RequisitionLineRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
    AssetCatalogueItem(AssetCatalogueItemRow),
    AssetCategory(AssetCategoryRow),
    AssetClass(AssetClassRow),
    AssetLogReason(AssetLogReasonRow),
    AssetProperty(AssetPropertyRow),
    BackendPlugin(BackendPluginRow),
    BundledItem(BundledItemRow),
    Campaign(CampaignRow),
    Demographic(DemographicRow),
    FormSchema(FormSchemaRow),
    FrontendPlugin(FrontendPluginRow),
    ItemVariant(ItemVariantRow),
    NameProperty(NamePropertyRow),
    PackagingVariant(PackagingVariantRow),
    Property(PropertyRow),
    Report(ReportRow),
    VaccineCourse(VaccineCourseRow),
    VaccineCourseDose(VaccineCourseDoseRow),
    VaccineCourseItem(VaccineCourseItemRow),
    VaccineCourseStoreConfig(VaccineCourseStoreConfigRow),
    LocationType(LocationTypeRow),
    MasterList(MasterListRow),
    Store(StoreRow),
    Unit(UnitRow),
    Asset(AssetRow),
    AssetInternalLocation(AssetInternalLocationRow),
    AssetLog(AssetLogRow),
    Encounter(EncounterRow),
    RnrForm(RnRFormRow),
    RnrFormLine(RnRFormLineRow),
    SyncMessage(SyncMessageRow),
    Vaccination(VaccinationRow),
    SyncFileReference(SyncFileReferenceRow),
    PluginData(PluginDataRow),
    Preference(PreferenceRow),
    ContactForm(ContactFormRow),
    SystemLog(SystemLogRow),
    Abbreviation(AbbreviationRow),
    Category(CategoryRow),
    Contact(ContactRow),
    ContactTrace(ContactTraceRow),
    Context(ContextRow),
    DemographicIndicator(DemographicIndicatorRow),
    Diagnosis(DiagnosisRow),
    DocumentRegistry(DocumentRegistryRow),
    IndicatorColumn(IndicatorColumnRow),
    IndicatorLine(IndicatorLineRow),
    ItemCategoryJoin(ItemCategoryJoinRow),
    ItemDirection(ItemDirectionRow),
    ItemStoreJoin(ItemStoreJoinRow),
    ItemWarningJoin(ItemWarningJoinRow),
    MasterListLine(MasterListLineRow),
    MasterListNameJoin(MasterListNameJoinRow),
    NameTag(NameTagRow),
    NameTagJoin(NameTagJoinRow),
    Period(PeriodRow),
    PeriodSchedule(PeriodScheduleRow),
    Printer(PrinterRow),
    Program(ProgramRow),
    ProgramEnrolment(ProgramEnrolmentRow),
    ProgramEvent(ProgramEventRow),
    ProgramIndicator(ProgramIndicatorRow),
    ProgramRequisitionOrderType(ProgramRequisitionOrderTypeRow),
    ProgramRequisitionSettings(ProgramRequisitionSettingsRow),
    ReasonOption(ReasonOptionRow),
    ShippingMethod(ShippingMethodRow),
    StorePreference(StorePreferenceRow),
    UserAccount(UserAccountRow),
    UserPermission(UserPermissionRow),
    UserStoreJoin(UserStoreJoinRow),
    VVMStatus(VVMStatusRow),
    NameOmsFields(NameOmsFieldsRow),
    Site(SiteRow),
    AssetCatalogueType(AssetTypeRow),
    SyncRequest(SyncRequestRow),
}

/// Output entry of `query_with_data`. `Row` carries the loaded row
/// alongside its changelog; `Delete` carries only the changelog (the record
/// no longer exists or was deleted).
#[derive(Debug, Clone)]
pub enum RowOrDelete {
    Row { changelog: ChangelogRow, row: Row },
    Delete { changelog: ChangelogRow },
}

impl RowOrDelete {
    pub fn changelog(&self) -> &ChangelogRow {
        match self {
            RowOrDelete::Row { changelog, .. } => changelog,
            RowOrDelete::Delete { changelog } => changelog,
        }
    }
}

impl<'a> ChangelogRepository<'a> {
    /// Like `ChangelogRepository::query`, but additionally loads the underlying
    /// row for each Upsert changelog (in batched queries grouped by table) and
    /// returns a `RowOrDelete`.
    ///
    /// Guarantees:
    /// - Returns up to `limit` entries. Falls short only when the changelog
    ///   stream is exhausted.
    /// - Within a (table_name, record_id) group, only the latest changelog
    ///   (highest cursor) is represented in the output. Re-queries to top up
    ///   when duplicates collapse the count.
    /// - If an Upsert changelog points to a row that no longer exists, that
    ///   entry is dropped from the output (the latest truth is "no row");
    ///   re-queries to top up.
    /// - Output is ordered ascending by cursor.
    ///
    /// Currently supports the variants in the `Row` enum. Other variants will
    /// trigger `unimplemented!()`. Callers should restrict `filter` accordingly.

    pub fn query_with_data(
        &self,
        filter: ChangelogCondition::Inner,
        CursorAndLimit { cursor, limit }: CursorAndLimit,
    ) -> Result<Vec<RowOrDelete>, RepositoryError> {
        let mut output_by_key: HashMap<(ChangelogTableName, String), RowOrDelete> = HashMap::new();
        let mut current_cursor = cursor;

        loop {
            let need = limit - output_by_key.len() as i64;
            if need <= 0 {
                break;
            }

            let changelogs = self.query(
                filter.clone(),
                CursorAndLimit {
                    cursor: current_cursor,
                    limit: need,
                },
            )?;

            if changelogs.is_empty() {
                break;
            }

            let last_cursor = changelogs
                .last()
                .map(|c| c.cursor)
                .unwrap_or(current_cursor);

            // Within-batch dedup: keep only the latest changelog for each
            // (table_name, record_id). `query` returns ascending by cursor, so
            // a plain insert into a HashMap does this.
            let mut batch_dedup: HashMap<(ChangelogTableName, String), ChangelogRow> =
                HashMap::new();
            for cl in changelogs {
                batch_dedup.insert((cl.table_name.clone(), cl.record_id.clone()), cl);
            }

            // Group upserts by table for batched row fetching.
            let mut upsert_ids_by_table: HashMap<ChangelogTableName, Vec<String>> = HashMap::new();
            for cl in batch_dedup.values() {
                if matches!(cl.row_action, RowActionType::Upsert) {
                    upsert_ids_by_table
                        .entry(cl.table_name.clone())
                        .or_default()
                        .push(cl.record_id.clone());
                }
            }

            let mut rows_by_table: HashMap<ChangelogTableName, HashMap<String, Row>> =
                HashMap::new();
            for (table_name, ids) in upsert_ids_by_table {
                let rows = fetch_rows_for_table(self.connection, &table_name, &ids)?;
                rows_by_table.insert(table_name, rows);
            }

            // Apply this batch to output_by_key, with cross-iteration supersession.
            for ((table_name, record_id), cl) in batch_dedup {
                let key = (table_name.clone(), record_id.clone());
                match cl.row_action {
                    RowActionType::Delete => {
                        output_by_key.insert(key, RowOrDelete::Delete { changelog: cl });
                    }
                    RowActionType::Upsert => {
                        let row = rows_by_table
                            .get_mut(&table_name)
                            .and_then(|m| m.remove(&record_id));
                        match row {
                            Some(row) => {
                                output_by_key.insert(key, RowOrDelete::Row { changelog: cl, row });
                            }
                            None => {
                                // Latest changelog for this key is an Upsert pointing
                                // at a missing row — supersedes any earlier output.
                                output_by_key.remove(&key);
                            }
                        }
                    }
                }
            }

            current_cursor = last_cursor;
        }

        let mut output: Vec<RowOrDelete> = output_by_key.into_values().collect();
        output.sort_by_key(|x| x.changelog().cursor);
        Ok(output)
    }
}

fn fetch_rows_for_table(
    connection: &StorageConnection,
    table_name: &ChangelogTableName,
    ids: &[String],
) -> Result<HashMap<String, Row>, RepositoryError> {
    let mut out: HashMap<String, Row> = HashMap::new();

    for chunk in ids.chunks(ROW_FETCH_BATCH_SIZE) {
        match table_name {
            ChangelogTableName::ActivityLog => {
                for r in ActivityLogRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ActivityLog(r));
                }
            }
            ChangelogTableName::Barcode => {
                for r in BarcodeRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Barcode(r));
                }
            }
            ChangelogTableName::Clinician => {
                for r in ClinicianRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Clinician(r));
                }
            }
            ChangelogTableName::ClinicianStoreJoin => {
                for r in ClinicianStoreJoinRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ClinicianStoreJoin(r));
                }
            }
            ChangelogTableName::Currency => {
                for r in CurrencyRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Currency(r));
                }
            }
            ChangelogTableName::Document => {
                for r in DocumentRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Document(r));
                }
            }
            ChangelogTableName::IndicatorValue => {
                for r in IndicatorValueRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::IndicatorValue(r));
                }
            }
            ChangelogTableName::InsuranceProvider => {
                for r in InsuranceProviderRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::InsuranceProvider(r));
                }
            }
            ChangelogTableName::Item => {
                for r in ItemRowRepository::new(connection).find_many_by_id(&chunk.to_vec())? {
                    out.insert(r.id.clone(), Row::Item(r));
                }
            }
            ChangelogTableName::Location => {
                for r in LocationRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Location(r));
                }
            }
            ChangelogTableName::LocationMovement => {
                for r in LocationMovementRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::LocationMovement(r));
                }
            }
            ChangelogTableName::Name => {
                for r in NameRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Name(r));
                }
            }
            ChangelogTableName::NameInsuranceJoin => {
                for r in NameInsuranceJoinRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::NameInsuranceJoin(r));
                }
            }
            ChangelogTableName::NameStoreJoin => {
                for r in NameStoreJoinRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::NameStoreJoin(r));
                }
            }
            ChangelogTableName::PurchaseOrder => {
                for r in PurchaseOrderRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::PurchaseOrder(r));
                }
            }
            ChangelogTableName::PurchaseOrderLine => {
                for r in PurchaseOrderLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::PurchaseOrderLine(r));
                }
            }
            ChangelogTableName::Sensor => {
                for r in SensorRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Sensor(r));
                }
            }
            ChangelogTableName::StockLine => {
                for r in StockLineRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::StockLine(r));
                }
            }
            ChangelogTableName::Stocktake => {
                for r in StocktakeRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Stocktake(r));
                }
            }
            ChangelogTableName::StocktakeLine => {
                for r in StocktakeLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::StocktakeLine(r));
                }
            }
            ChangelogTableName::TemperatureBreach => {
                for r in TemperatureBreachRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::TemperatureBreach(r));
                }
            }
            ChangelogTableName::TemperatureLog => {
                for r in TemperatureLogRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::TemperatureLog(r));
                }
            }
            ChangelogTableName::VVMStatusLog => {
                for r in VVMStatusLogRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::VVMStatusLog(r));
                }
            }
            ChangelogTableName::Requisition => {
                for r in RequisitionRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Requisition(r));
                }
            }
            ChangelogTableName::RequisitionLine => {
                for r in RequisitionLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::RequisitionLine(r));
                }
            }
            ChangelogTableName::Invoice => {
                for r in InvoiceRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Invoice(r));
                }
            }
            ChangelogTableName::InvoiceLine => {
                for r in InvoiceLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::InvoiceLine(r));
                }
            }
            ChangelogTableName::AssetCatalogueItem => {
                for r in AssetCatalogueItemRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetCatalogueItem(r));
                }
            }
            ChangelogTableName::AssetCategory => {
                for r in AssetCategoryRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetCategory(r));
                }
            }
            ChangelogTableName::AssetClass => {
                for r in AssetClassRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetClass(r));
                }
            }
            ChangelogTableName::AssetLogReason => {
                for r in AssetLogReasonRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetLogReason(r));
                }
            }
            ChangelogTableName::AssetProperty => {
                for r in AssetPropertyRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetProperty(r));
                }
            }
            ChangelogTableName::BackendPlugin => {
                for r in BackendPluginRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::BackendPlugin(r));
                }
            }
            ChangelogTableName::BundledItem => {
                for r in BundledItemRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::BundledItem(r));
                }
            }
            ChangelogTableName::Campaign => {
                for r in CampaignRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Campaign(r));
                }
            }
            ChangelogTableName::Demographic => {
                for r in DemographicRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Demographic(r));
                }
            }
            ChangelogTableName::FormSchema => {
                for r in FormSchemaRowRepository::new(connection).find_many_rows_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::FormSchema(r));
                }
            }
            ChangelogTableName::FrontendPlugin => {
                for r in FrontendPluginRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::FrontendPlugin(r));
                }
            }
            ChangelogTableName::ItemVariant => {
                for r in ItemVariantRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ItemVariant(r));
                }
            }
            ChangelogTableName::NameProperty => {
                for r in NamePropertyRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::NameProperty(r));
                }
            }
            ChangelogTableName::PackagingVariant => {
                for r in PackagingVariantRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::PackagingVariant(r));
                }
            }
            ChangelogTableName::Property => {
                for r in PropertyRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Property(r));
                }
            }
            ChangelogTableName::Report => {
                for r in ReportRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Report(r));
                }
            }
            ChangelogTableName::VaccineCourse => {
                for r in VaccineCourseRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::VaccineCourse(r));
                }
            }
            ChangelogTableName::VaccineCourseDose => {
                for r in VaccineCourseDoseRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::VaccineCourseDose(r));
                }
            }
            ChangelogTableName::VaccineCourseItem => {
                for r in VaccineCourseItemRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::VaccineCourseItem(r));
                }
            }
            ChangelogTableName::VaccineCourseStoreConfig => {
                for r in
                    VaccineCourseStoreConfigRowRepository::new(connection).find_many_by_id(chunk)?
                {
                    out.insert(r.id.clone(), Row::VaccineCourseStoreConfig(r));
                }
            }
            ChangelogTableName::LocationType => {
                for r in LocationTypeRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::LocationType(r));
                }
            }
            ChangelogTableName::MasterList => {
                for r in MasterListRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::MasterList(r));
                }
            }
            ChangelogTableName::Store => {
                for r in StoreRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Store(r));
                }
            }
            ChangelogTableName::Unit => {
                for r in UnitRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Unit(r));
                }
            }
            ChangelogTableName::Asset => {
                for r in AssetRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Asset(r));
                }
            }
            ChangelogTableName::AssetInternalLocation => {
                for r in
                    AssetInternalLocationRowRepository::new(connection).find_many_by_id(chunk)?
                {
                    out.insert(r.id.clone(), Row::AssetInternalLocation(r));
                }
            }
            ChangelogTableName::AssetLog => {
                for r in AssetLogRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetLog(r));
                }
            }
            ChangelogTableName::Encounter => {
                for r in EncounterRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Encounter(r));
                }
            }
            ChangelogTableName::RnrForm => {
                for r in RnRFormRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::RnrForm(r));
                }
            }
            ChangelogTableName::RnrFormLine => {
                for r in RnRFormLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::RnrFormLine(r));
                }
            }
            ChangelogTableName::SyncMessage => {
                for r in SyncMessageRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::SyncMessage(r));
                }
            }
            ChangelogTableName::Vaccination => {
                for r in VaccinationRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Vaccination(r));
                }
            }
            ChangelogTableName::SyncFileReference => {
                for r in SyncFileReferenceRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::SyncFileReference(r));
                }
            }
            ChangelogTableName::PluginData => {
                for r in PluginDataRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::PluginData(r));
                }
            }
            ChangelogTableName::Preference => {
                for r in PreferenceRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Preference(r));
                }
            }
            ChangelogTableName::ContactForm => {
                for r in ContactFormRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ContactForm(r));
                }
            }
            ChangelogTableName::SystemLog => {
                for r in SystemLogRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::SystemLog(r));
                }
            }
            ChangelogTableName::Abbreviation => {
                for r in AbbreviationRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Abbreviation(r));
                }
            }
            ChangelogTableName::Category => {
                for r in CategoryRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Category(r));
                }
            }
            ChangelogTableName::Contact => {
                for r in ContactRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Contact(r));
                }
            }
            ChangelogTableName::ContactTrace => {
                for r in ContactTraceRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ContactTrace(r));
                }
            }
            ChangelogTableName::Context => {
                for r in ContextRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Context(r));
                }
            }
            ChangelogTableName::DemographicIndicator => {
                for r in
                    DemographicIndicatorRowRepository::new(connection).find_many_by_id(chunk)?
                {
                    out.insert(r.id.clone(), Row::DemographicIndicator(r));
                }
            }
            ChangelogTableName::Diagnosis => {
                for r in DiagnosisRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Diagnosis(r));
                }
            }
            ChangelogTableName::DocumentRegistry => {
                for r in DocumentRegistryRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::DocumentRegistry(r));
                }
            }
            ChangelogTableName::IndicatorColumn => {
                for r in IndicatorColumnRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::IndicatorColumn(r));
                }
            }
            ChangelogTableName::IndicatorLine => {
                for r in IndicatorLineRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::IndicatorLine(r));
                }
            }
            ChangelogTableName::ItemCategoryJoin => {
                for r in ItemCategoryJoinRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ItemCategoryJoin(r));
                }
            }
            ChangelogTableName::ItemDirection => {
                for r in ItemDirectionRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ItemDirection(r));
                }
            }
            ChangelogTableName::ItemStoreJoin => {
                for r in ItemStoreJoinRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ItemStoreJoin(r));
                }
            }
            ChangelogTableName::ItemWarningJoin => {
                for r in ItemWarningJoinRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ItemWarningJoin(r));
                }
            }
            ChangelogTableName::MasterListLine => {
                for r in MasterListLineRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::MasterListLine(r));
                }
            }
            ChangelogTableName::MasterListNameJoin => {
                for r in MasterListNameJoinRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::MasterListNameJoin(r));
                }
            }
            ChangelogTableName::NameTag => {
                for r in NameTagRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::NameTag(r));
                }
            }
            ChangelogTableName::NameTagJoin => {
                for r in NameTagJoinRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::NameTagJoin(r));
                }
            }
            ChangelogTableName::Period => {
                for r in PeriodRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Period(r));
                }
            }
            ChangelogTableName::PeriodSchedule => {
                for r in PeriodScheduleRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::PeriodSchedule(r));
                }
            }
            ChangelogTableName::Printer => {
                for r in PrinterRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Printer(r));
                }
            }
            ChangelogTableName::Program => {
                for r in ProgramRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Program(r));
                }
            }
            ChangelogTableName::ProgramEnrolment => {
                for r in ProgramEnrolmentRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ProgramEnrolment(r));
                }
            }
            ChangelogTableName::ProgramEvent => {
                for r in ProgramEventRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ProgramEvent(r));
                }
            }
            ChangelogTableName::ProgramIndicator => {
                for r in ProgramIndicatorRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ProgramIndicator(r));
                }
            }
            ChangelogTableName::ProgramRequisitionOrderType => {
                for r in ProgramRequisitionOrderTypeRowRepository::new(connection)
                    .find_many_by_id(chunk)?
                {
                    out.insert(r.id.clone(), Row::ProgramRequisitionOrderType(r));
                }
            }
            ChangelogTableName::ProgramRequisitionSettings => {
                for r in ProgramRequisitionSettingsRowRepository::new(connection)
                    .find_many_by_id(chunk)?
                {
                    out.insert(r.id.clone(), Row::ProgramRequisitionSettings(r));
                }
            }
            ChangelogTableName::ReasonOption => {
                for r in ReasonOptionRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ReasonOption(r));
                }
            }
            ChangelogTableName::ShippingMethod => {
                for r in ShippingMethodRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::ShippingMethod(r));
                }
            }
            ChangelogTableName::StorePreference => {
                for r in StorePreferenceRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::StorePreference(r));
                }
            }
            ChangelogTableName::UserAccount => {
                for r in UserAccountRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::UserAccount(r));
                }
            }
            ChangelogTableName::UserPermission => {
                for r in UserPermissionRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::UserPermission(r));
                }
            }
            ChangelogTableName::UserStoreJoin => {
                for r in UserStoreJoinRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::UserStoreJoin(r));
                }
            }
            ChangelogTableName::VVMStatus => {
                for r in VVMStatusRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::VVMStatus(r));
                }
            }
            ChangelogTableName::NameOmsFields => {
                for r in NameRowRepository::new(connection).find_many_oms_fields_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::NameOmsFields(r));
                }
            }
            ChangelogTableName::Site => {
                let int_ids: Vec<i32> = chunk.iter().filter_map(|s| s.parse().ok()).collect();
                for r in SiteRowRepository::new(connection).find_many_by_id(&int_ids)? {
                    out.insert(r.id.to_string(), Row::Site(r));
                }
            }
            ChangelogTableName::AssetCatalogueType => {
                for r in AssetTypeRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::AssetCatalogueType(r));
                }
            }
            ChangelogTableName::SyncRequest => {
                for r in SyncRequestRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::SyncRequest(r));
                }
            }
        }
    }

    Ok(out)
}

#[cfg(test)]
mod test {
    use super::*;
    use util::assert_matches;

    use crate::{
        dynamic_query_filter::FilterBuilder, mock::MockDataInserts, test_db::setup_all,
        ChangeLogInsertRow,
    };

    fn unit_filter() -> ChangelogCondition::Inner {
        ChangelogCondition::table_name::any(vec![ChangelogTableName::Unit])
    }

    fn insert_changelog(connection: &StorageConnection, row: ChangeLogInsertRow) -> i64 {
        let repo = ChangelogRepository::new(connection);
        repo.insert(&row).unwrap();
        repo.max_cursor().unwrap() as i64
    }

    fn upsert_unit(connection: &StorageConnection, id: &str) -> i64 {
        UnitRowRepository::new(connection)
            .upsert_one(&UnitRow {
                id: id.to_string(),
                name: format!("name-{id}"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();
        insert_changelog(
            connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        )
    }

    fn delete_unit_changelog(connection: &StorageConnection, id: &str) -> i64 {
        insert_changelog(
            connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
                row_action: RowActionType::Delete,
                ..Default::default()
            },
        )
    }

    #[actix_rt::test]
    async fn query_with_data_basic_mix() {
        let (_, connection, _, _) =
            setup_all("query_with_data_basic_mix", MockDataInserts::none()).await;

        let c1 = upsert_unit(&connection, "u1");
        let c2 = upsert_unit(&connection, "u2");
        let c3 = delete_unit_changelog(&connection, "u3");

        let result = ChangelogRepository::new(&connection)
            .query_with_data(
                unit_filter(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 10,
                },
            )
            .unwrap();

        assert_eq!(result.len(), 3);
        // Ordered ascending by cursor
        assert_eq!(result[0].changelog().cursor, c1);
        assert_eq!(result[1].changelog().cursor, c2);
        assert_eq!(result[2].changelog().cursor, c3);

        match &result[0] {
            RowOrDelete::Row {
                row: Row::Unit(u), ..
            } => assert_eq!(u.id, "u1"),
            _ => panic!("expected Row::Unit for u1"),
        }
        match &result[1] {
            RowOrDelete::Row {
                row: Row::Unit(u), ..
            } => assert_eq!(u.id, "u2"),
            _ => panic!("expected Row::Unit for u2"),
        }
        assert_matches!(&result[2], RowOrDelete::Delete { .. });
    }

    #[actix_rt::test]
    async fn query_with_data_dedups_and_tops_up() {
        let (_, connection, _, _) = setup_all(
            "query_with_data_dedups_and_tops_up",
            MockDataInserts::none(),
        )
        .await;

        // Three changelogs for u1 (duplicates), one each for u2/u3.
        upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u1");
        let last_u1 = upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");
        upsert_unit(&connection, "u3");

        let result = ChangelogRepository::new(&connection)
            .query_with_data(
                unit_filter(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 3,
                },
            )
            .unwrap();

        // Three distinct keys, exactly limit. u1 collapsed to its latest cursor.
        assert_eq!(result.len(), 3);
        let u1 = result
            .iter()
            .find(|x| x.changelog().record_id == "u1")
            .unwrap();
        assert_eq!(u1.changelog().cursor, last_u1);

        let ids: Vec<&str> = result
            .iter()
            .map(|x| x.changelog().record_id.as_str())
            .collect();
        assert!(ids.contains(&"u1"));
        assert!(ids.contains(&"u2"));
        assert!(ids.contains(&"u3"));
    }

    #[actix_rt::test]
    async fn query_with_data_skips_missing_and_tops_up() {
        let (_, connection, _, _) = setup_all(
            "query_with_data_skips_missing_and_tops_up",
            MockDataInserts::none(),
        )
        .await;

        // u1 exists, u2 has only a changelog (no underlying row), u3 exists.
        upsert_unit(&connection, "u1");
        insert_changelog(
            &connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u2".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        );
        upsert_unit(&connection, "u3");

        let result = ChangelogRepository::new(&connection)
            .query_with_data(
                unit_filter(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 2,
                },
            )
            .unwrap();

        // u2 is dropped (Upsert pointing to non-existent row); u1 + u3 remain
        // and were topped up to reach limit=2.
        assert_eq!(result.len(), 2);
        let ids: Vec<&str> = result
            .iter()
            .map(|x| x.changelog().record_id.as_str())
            .collect();
        assert_eq!(ids, vec!["u1", "u3"]);
    }

    #[actix_rt::test]
    async fn query_with_data_returns_short_when_exhausted() {
        let (_, connection, _, _) = setup_all(
            "query_with_data_returns_short_when_exhausted",
            MockDataInserts::none(),
        )
        .await;

        upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = ChangelogRepository::new(&connection)
            .query_with_data(
                unit_filter(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 100,
                },
            )
            .unwrap();

        assert_eq!(result.len(), 2);
    }

    #[actix_rt::test]
    async fn query_with_data_dedups_across_iterations() {
        // Same (table, record_id) appears in two different iterations and
        // the later (higher-cursor) entry should replace the earlier one
        // already in `output_by_key`.
        //
        // Sequence:
        //   C1: u1 upsert (row exists)
        //   C2: u_missing upsert (no row)  <- skipped, keeps need > 0
        //   C3: u1 upsert again            <- same key, must supersede C1
        //   C4: u2 upsert (row exists)     <- fills second slot
        //
        // With limit=2, iter 1 fetches C1+C2 and materializes {u1: C1};
        // iter 2 fetches C3 and rewrites u1's entry to cursor C3 (output
        // count stays at 1, so the loop continues); iter 3 fetches C4.
        let (_, connection, _, _) = setup_all(
            "query_with_data_dedups_across_iterations",
            MockDataInserts::none(),
        )
        .await;

        let _c1 = upsert_unit(&connection, "u1");
        insert_changelog(
            &connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u_missing".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        );
        let c3 = upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = ChangelogRepository::new(&connection)
            .query_with_data(
                unit_filter(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 2,
                },
            )
            .unwrap();

        assert_eq!(result.len(), 2);
        let u1 = result
            .iter()
            .find(|x| x.changelog().record_id == "u1")
            .unwrap();
        // The cross-iteration replacement: u1's cursor must be C3, not C1.
        assert_eq!(u1.changelog().cursor, c3);
        assert_matches!(
            u1,
            RowOrDelete::Row {
                row: Row::Unit(_),
                ..
            }
        );
    }

    #[actix_rt::test]
    async fn query_with_data_supersedes_across_iterations() {
        // Force the loop into a second iteration by injecting a missing-row
        // upsert in the first batch, then verify a later changelog
        // supersedes an entry we already materialized.
        //
        // Sequence:
        //   C1: u1 upsert (row exists)
        //   C2: u_missing upsert (no row)  <- skipped, keeps need > 0
        //   C3: u1 delete                  <- supersedes the C1 entry
        //   C4: u2 upsert (row exists)
        //
        // With limit=2, the first inner call returns C1+C2, materializes
        // {u1: Row}; the second call returns C3, supersedes u1 to Delete;
        // the third returns C4, fills the second slot.
        let (_, connection, _, _) = setup_all(
            "query_with_data_supersedes_across_iterations",
            MockDataInserts::none(),
        )
        .await;

        upsert_unit(&connection, "u1");
        insert_changelog(
            &connection,
            ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u_missing".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            },
        );
        let c3 = delete_unit_changelog(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = ChangelogRepository::new(&connection)
            .query_with_data(
                unit_filter(),
                CursorAndLimit {
                    cursor: 0,
                    limit: 2,
                },
            )
            .unwrap();

        assert_eq!(result.len(), 2);
        let u1 = result
            .iter()
            .find(|x| x.changelog().record_id == "u1")
            .unwrap();
        assert_eq!(u1.changelog().cursor, c3);
        assert_matches!(u1, RowOrDelete::Delete { .. });
        let u2 = result
            .iter()
            .find(|x| x.changelog().record_id == "u2")
            .unwrap();
        assert_matches!(
            u2,
            RowOrDelete::Row {
                row: Row::Unit(_),
                ..
            }
        );
    }
}
