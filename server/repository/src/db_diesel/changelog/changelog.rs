use crate::{
    db_diesel::store_row::store,
    diesel_macros::{apply_equal_filter, diesel_string_enum},
    dynamic_query_filter::create_condition,
    name_store_join::name_store_join,
    vaccination_row::vaccination,
    CurrencyRow, CurrencyRowRepository, DBType, EqualFilter, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, ItemRow, ItemRowRepository,
    LocationTypeRow, LocationTypeRowRepository, LockedConnection, NameRow, NameRowRepository,
    RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection, StoreRow,
    StoreRowRepository, TransactionNotification, UnitRow, UnitRowRepository,
};
use diesel::{dsl::LeftJoinQuerySource, helper_types::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::convert::TryInto;
use strum::IntoEnumIterator;
use ts_rs::TS;

table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> Text,
        record_id -> Text,
        row_action -> Text,
        name_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
        transfer_store_id -> Nullable<Text>,
        patient_id -> Nullable<Text>,
    }
}

allow_tables_to_appear_in_same_query!(changelog, vaccination);
allow_tables_to_appear_in_same_query!(changelog, store);

diesel::alias!(store as transfer_stores: TransferStores);

#[diesel::dsl::auto_type]
fn query() -> _ {
    changelog::table
        .left_join(store::table.on(store::id.nullable().eq(changelog::store_id)))
        .left_join(
            transfer_stores.on(transfer_stores
                .field(store::id)
                .nullable()
                .eq(changelog::transfer_store_id)),
        )
}

type Source = LeftJoinQuerySource<
    LeftJoinQuerySource<
        changelog::table,
        store::table,
        diesel::dsl::Eq<diesel::dsl::Nullable<store::id>, changelog::store_id>,
    >,
    transfer_stores,
    diesel::dsl::Eq<
        diesel::dsl::Nullable<diesel::dsl::Field<transfer_stores, store::id>>,
        changelog::transfer_store_id,
    >,
>;

#[cfg(not(feature = "postgres"))]
define_sql_function!(
    fn last_insert_rowid() -> BigInt
);

diesel_string_enum! {
    #[derive(Clone, Eq, Serialize, Deserialize, TS)]
    #[strum(serialize_all = "snake_case")]
    pub enum RowActionType {
        #[default]
        Upsert,
        Delete,
    }
}

diesel_string_enum! {
    #[derive(Clone, Eq, Hash, Serialize, Deserialize, strum::EnumIter, TS)]
    #[strum(serialize_all = "snake_case")]
    pub enum ChangelogTableName {
        Unit,
        Store,
        LocationType,
        BackendPlugin,
        Number,
        Location,
        LocationMovement,
        StockLine,
        Invoice,
        InvoiceLine,
        Stocktake,
        StocktakeLine,
        Requisition,
        RequisitionLine,
        ActivityLog,
        Barcode,
        Clinician,
        ClinicianStoreJoin,
        Name,
        NameStoreJoin,
        Document,
        Sensor,
        TemperatureBreach,
        TemperatureBreachConfig,
        TemperatureLog,
        PackVariant,
        Currency,
        AssetClass,
        AssetCategory,
        AssetCatalogueType,
        AssetCatalogueItem,
        AssetCatalogueItemProperty,
        AssetCatalogueProperty,
        AssetInternalLocation,
        #[default]
        SyncFileReference,
        Asset,
        AssetLog,
        AssetLogReason,
        AssetProperty,
        Property,
        NameProperty,
        NameOmsFields,
        RnrForm,
        RnrFormLine,
        Demographic,
        VaccineCourse,
        VaccineCourseItem,
        VaccineCourseDose,
        VaccineCourseStoreConfig,
        Vaccination,
        Encounter,
        ItemVariant,
        PackagingVariant,
        IndicatorValue,
        BundledItem,
        Item,
        ContactForm,
        SystemLog,
        InsuranceProvider,
        FrontendPlugin,
        NameInsuranceJoin,
        Report,
        FormSchema,
        PluginData,
        Preference,
        VVMStatusLog,
        Campaign,
        SyncMessage,
        PurchaseOrder,
        PurchaseOrderLine,
        MasterList,
        Site,
    }
}

pub(crate) enum ChangeLogSyncStyle {
    Legacy,  // Everything that goes to Legacy mSupply server
    Central, // Data created on Open-mSupply central server
    Remote,
    File,
    RemoteAndCentral, // These records will sync like remote record if store_id exist, otherwise they will sync like central records
    RemoteToCentral,  // These records won't sync back to the remote site on re-initalisation
    ProcessorOnly,    // There records won't sync anywhere, only used for processor tasks
}
// When adding a new change log record type, specify how it should be synced
// If new requirements are needed a different ChangeLogSyncStyle can be added
impl ChangelogTableName {
    pub(crate) fn sync_style(&self) -> ChangeLogSyncStyle {
        match self {
            ChangelogTableName::Unit => ChangeLogSyncStyle::Central,
            ChangelogTableName::Store => ChangeLogSyncStyle::Central,
            ChangelogTableName::LocationType => ChangeLogSyncStyle::Central,
            ChangelogTableName::BackendPlugin => ChangeLogSyncStyle::Central,
            ChangelogTableName::Number => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Location => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::LocationMovement => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::StockLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Invoice => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::InvoiceLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Stocktake => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::StocktakeLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Requisition => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::RequisitionLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::ActivityLog => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Barcode => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Clinician => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::ClinicianStoreJoin => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Name => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::NameStoreJoin => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Document => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Sensor => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::TemperatureBreach => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::TemperatureBreachConfig => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::TemperatureLog => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Currency => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Item => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::PackVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetClass => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCategory => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueType => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::Asset => ChangeLogSyncStyle::Remote,
            ChangelogTableName::AssetInternalLocation => ChangeLogSyncStyle::Remote,
            ChangelogTableName::SyncFileReference => ChangeLogSyncStyle::File,
            ChangelogTableName::AssetLog => ChangeLogSyncStyle::Remote,
            ChangelogTableName::AssetCatalogueItemProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetLogReason => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::Property => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameOmsFields => ChangeLogSyncStyle::Central,
            ChangelogTableName::RnrForm => ChangeLogSyncStyle::Remote,
            ChangelogTableName::RnrFormLine => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Demographic => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourse => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourseItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourseDose => ChangeLogSyncStyle::Central,
            ChangelogTableName::VaccineCourseStoreConfig => ChangeLogSyncStyle::Central,
            ChangelogTableName::Vaccination => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Encounter => ChangeLogSyncStyle::Remote,
            ChangelogTableName::ItemVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::PackagingVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::IndicatorValue => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::BundledItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::ContactForm => ChangeLogSyncStyle::RemoteToCentral,
            ChangelogTableName::SystemLog => ChangeLogSyncStyle::RemoteToCentral,
            ChangelogTableName::InsuranceProvider => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::FrontendPlugin => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameInsuranceJoin => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Report => ChangeLogSyncStyle::Central,
            ChangelogTableName::FormSchema => ChangeLogSyncStyle::Central,
            ChangelogTableName::PluginData => ChangeLogSyncStyle::RemoteAndCentral,
            ChangelogTableName::Preference => ChangeLogSyncStyle::RemoteAndCentral,
            ChangelogTableName::VVMStatusLog => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::Campaign => ChangeLogSyncStyle::Central,
            ChangelogTableName::SyncMessage => ChangeLogSyncStyle::Remote,
            ChangelogTableName::PurchaseOrder => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::PurchaseOrderLine => ChangeLogSyncStyle::Legacy,
            ChangelogTableName::MasterList => ChangeLogSyncStyle::ProcessorOnly,
            ChangelogTableName::Site => ChangeLogSyncStyle::Central,
        }
    }
}

#[derive(Debug, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogInsertRow {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    #[diesel(column_name = "name_link_id")]
    pub name_id: Option<String>,
    pub store_id: Option<String>,
    pub is_sync_update: Option<bool>,
    pub source_site_id: Option<i32>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
}

#[derive(Clone, Queryable, Debug, PartialEq, Insertable, Serialize, Deserialize, TS, Default)]
#[diesel(table_name = changelog)]
pub struct ChangelogRow {
    pub cursor: i64,
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    #[diesel(column_name = "name_link_id")]
    pub name_id: Option<String>,
    pub store_id: Option<String>,
    pub is_sync_update: bool,
    pub source_site_id: Option<i32>,
    pub transfer_store_id: Option<String>,
    pub patient_id: Option<String>,
}

#[derive(Default, Clone, Serialize, Deserialize, Debug, TS)]
pub struct ChangelogFilter {
    #[ts(optional)]
    pub table_name: Option<EqualFilter<ChangelogTableName>>,
    #[ts(optional)]
    pub name_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub record_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub action: Option<EqualFilter<RowActionType>>,
    #[ts(optional)]
    pub is_sync_update: Option<EqualFilter<bool>>,
    #[ts(optional)]
    pub source_site_id: Option<EqualFilter<i32>>,
}

pub struct ChangelogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ChangelogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ChangelogRepository { connection }
    }

    /// Returns changelog rows order by operation sequence in asc order
    ///
    /// # Arguments
    ///
    /// * `earliest` - Starting cursor (first returned changelogs may be ahead in sequence from starting cursor)
    /// * `limit` - Maximum number of entries to be returned
    /// * `filter` - Extra filter to apply on change_logs
    pub fn changelogs(
        &self,
        earliest: u64,
        limit: u32,
        filter: Option<ChangelogFilter>,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let result = with_locked_changelog_table(self.connection, |locked_con| {
            let query = create_filtered_query(earliest, filter)
                .order(changelog::dsl::cursor.asc())
                .limit(limit.into());

            // // Debug diesel query
            // println!(
            //     "{}",
            //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
            // );

            let result: Vec<ChangelogRow> = query.load(locked_con.connection())?;
            Ok(result)
        })?;
        Ok(result)
    }

    pub fn count(
        &self,
        earliest: u64,
        filter: Option<ChangelogFilter>,
    ) -> Result<u64, RepositoryError> {
        let result = create_filtered_query(earliest, filter)
            .count()
            .get_result::<i64>(self.connection.lock().connection())?;
        Ok(result as u64)
    }

    pub fn outgoing_sync_records_from_central(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let result = with_locked_changelog_table(self.connection, |locked_con| {
            let query = create_filtered_outgoing_sync_query(earliest, sync_site_id, is_initialized)
                .order(changelog::cursor.asc())
                .limit(batch_size.into());

            // Debug diesel query
            // println!(
            //     "{}",
            //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
            // );

            let result: Vec<ChangelogRow> = query.load(locked_con.connection())?;
            Ok(result)
        })?;
        Ok(result)
    }

    pub fn outgoing_patient_sync_records_from_central(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        fetch_patient_id: String,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let result = with_locked_changelog_table(self.connection, |locked_con| {
            let query = create_filtered_outgoing_patient_sync_query(
                earliest,
                sync_site_id,
                fetch_patient_id,
            )
            .order(changelog::cursor.asc())
            .limit(batch_size.into());

            // Debug diesel query
            // println!(
            //     "{}",
            //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
            // );

            let result: Vec<ChangelogRow> = query.load(locked_con.connection())?;
            Ok(result)
        })?;
        Ok(result)
    }

    /// This returns the number of changelog records that should be evaluated to send to the remote site when doing a v6_pull
    /// This looks up associated records to decide if change log should be sent to the site or not
    /// Update this method when adding new record types to the system
    pub fn count_outgoing_sync_records_from_central(
        &self,
        earliest: u64,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<u64, RepositoryError> {
        let result = create_filtered_outgoing_sync_query(earliest, sync_site_id, is_initialized)
            .count()
            .get_result::<i64>(self.connection.lock().connection())?;
        Ok(result as u64)
    }

    pub fn count_outgoing_patient_sync_records_from_central(
        &self,
        earliest: u64,
        sync_site_id: i32,
        fetch_patient_id: String,
    ) -> Result<u64, RepositoryError> {
        let result =
            create_filtered_outgoing_patient_sync_query(earliest, sync_site_id, fetch_patient_id)
                .count()
                .get_result::<i64>(self.connection.lock().connection())?;
        Ok(result as u64)
    }

    /// Returns latest change log
    /// After initial sync we use this method to get the latest cursor to make sure we don't try to push any records that were synced to this site on initialisation
    pub fn latest_cursor(&self) -> Result<u64, RepositoryError> {
        let result = changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(self.connection.lock().connection())?;
        Ok(result.unwrap_or(0) as u64)
    }

    // Delete all change logs with cursor greater-equal cursor_ge
    pub fn delete(&self, cursor_ge: i64) -> Result<(), RepositoryError> {
        diesel::delete(changelog::dsl::changelog)
            .filter(changelog::dsl::cursor.ge(cursor_ge))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    // Needed for tests, when is_sync_update needs to be reset when records were inserted via
    // PullUpsertRecord (but not through sync)
    #[cfg(feature = "integration_test")]
    pub fn reset_is_sync_update(&self, from_cursor: u64) -> Result<(), RepositoryError> {
        diesel::update(changelog::table)
            .set(changelog::is_sync_update.eq(false))
            .filter(changelog::cursor.gt(from_cursor as i64))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn set_source_site_id_and_is_sync_update(
        &self,
        cursor_id: i64,
        source_site_id: Option<i32>,
    ) -> Result<(), RepositoryError> {
        diesel::update(changelog::table)
            .set((
                changelog::source_site_id.eq(source_site_id),
                changelog::is_sync_update.eq(true),
            ))
            .filter(changelog::cursor.eq(cursor_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Inserts a changelog record, and returns the cursor of the inserted record
    #[cfg(feature = "postgres")]
    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<i64, RepositoryError> {
        // Insert the record, and then return the cursor of the inserted record
        // Using a returning clause makes this thread safe
        let cursor_id = diesel::insert_into(changelog::table)
            .values(row)
            .returning(changelog::cursor)
            .get_results(self.connection.lock().connection())?
            .pop()
            .unwrap_or_default(); // This shouldn't happen, maybe should unwrap or panic?

        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(cursor_id)
    }

    #[cfg(not(feature = "postgres"))]
    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<i64, RepositoryError> {
        // Insert the record, and then return the cursor of the inserted record
        // SQLite docs say this is safe if you don't have different threads sharing a single connection
        diesel::insert_into(changelog::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        let cursor_id = diesel::select(last_insert_rowid())
            .get_result::<i64>(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(cursor_id)
    }
}

// Dynamic query filter for changelog
// Source type is the changelog table (for queries directly against the table)
create_condition!(
    ChangelogCondition,
    Source,
    (cursor, i64, changelog::cursor),
    (site_id, i32, store::site_id),
    (action, RowActionType, changelog::row_action),
    (table_name, ChangelogTableName, changelog::table_name),
    (store_id, string, changelog::store_id),
    (source_site_id, i32, changelog::source_site_id),
    (transfer_store_id, string, changelog::transfer_store_id),
    (patient_id, string, changelog::patient_id),
    (transfer_site_id, i32, transfer_stores.field(store::site_id)),
);

type BoxedChangelogQuery = IntoBoxed<'static, changelog::table, DBType>;

fn create_base_query(earliest: u64) -> BoxedChangelogQuery {
    changelog::table
        .filter(changelog::cursor.ge(earliest.try_into().unwrap_or(0)))
        .into_boxed()
}

fn create_filtered_query(earliest: u64, filter: Option<ChangelogFilter>) -> BoxedChangelogQuery {
    let mut query = create_base_query(earliest);

    if let Some(f) = filter {
        let ChangelogFilter {
            table_name,
            name_id,
            store_id,
            record_id,
            is_sync_update,
            action,
            source_site_id,
        } = f;

        apply_equal_filter!(query, table_name, changelog::table_name);
        apply_equal_filter!(query, name_id, changelog::name_link_id);
        apply_equal_filter!(query, store_id, changelog::store_id);
        apply_equal_filter!(query, record_id, changelog::record_id);
        apply_equal_filter!(query, action, changelog::row_action);
        apply_equal_filter!(query, is_sync_update, changelog::is_sync_update);
        apply_equal_filter!(query, source_site_id, changelog::source_site_id);
    }

    query
}

// The idea for this method is to build a query in such a way as to allow
// extracting all relevant records for a site from change_log
// A resulting SQL might look something like this...
//
// SELECT * FROM changelog_dedup
// WHERE cursor > {remote site SyncPullCursorV6} AND last_sync_site_id != {remote site id}
// AND
// (
// 	table_name in {central_record_names}
//  OR
// 	(table_name in {transfer record names}  AND name_id IN {name_ids of active stores on remote site})
//  OR
// 	// Special cases
// 	(table_name in {patient record name} AND patient_id IN {select name_id from name_store_join where store_id in {active stores on remote site})
// )

/// This looks up associated records to decide if change log should be sent to the site or not
/// Update this method when adding new sync styles to the system
fn create_filtered_outgoing_sync_query(
    earliest: u64,
    sync_site_id: i32,
    is_initialized: bool,
) -> BoxedChangelogQuery {
    let mut query = create_base_query(earliest);

    // If we are initialising, we want to send all the records for the site, even ones that originally came from the site
    // The rest of the time we want to exclude any records that were created by the site
    if is_initialized {
        query = query.filter(
            changelog::source_site_id
                .ne(Some(sync_site_id))
                .or(changelog::source_site_id.is_null()),
        )
    }

    // Loop through all the Sync tables and add them to the query if they have the right sync style

    // Central Records
    let central_sync_table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
        .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::Central))
        .collect();

    // Remote Records
    let remote_sync_table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
        .filter(|table| {
            matches!(
                table.sync_style(),
                ChangeLogSyncStyle::Remote | ChangeLogSyncStyle::RemoteAndCentral
            )
        })
        .collect();

    // Central record where store id is null
    let central_by_empty_store_id: Vec<ChangelogTableName> = ChangelogTableName::iter()
        .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::RemoteAndCentral))
        .collect();

    let active_stores_for_site = store::table
        .filter(store::site_id.eq(sync_site_id))
        .select(store::id.nullable());

    let patient_names_visible_on_site =
        patient_names_visible_on_site(sync_site_id).select(name_store_join::name_id.nullable());

    // Filter the query for the matching records for each type
    query = query.filter(
        changelog::table_name
            .eq_any(central_sync_table_names)
            .or(changelog::table_name.eq(ChangelogTableName::SyncFileReference)) // All sites get all sync file references (not necessarily files)
            .or(changelog::table_name
                .eq_any(remote_sync_table_names)
                .and(changelog::store_id.eq_any(active_stores_for_site.into_boxed())))
            .or(changelog::table_name
                .eq_any(central_by_empty_store_id)
                .and(changelog::store_id.is_null()))
            // Special case: patient Vaccination records
            // where patient is visible, regardless of the store_id in the changelog
            .or(changelog::table_name
                .eq(ChangelogTableName::Vaccination)
                .and(changelog::name_link_id.eq_any(patient_names_visible_on_site))),
        // Any other special cases could be handled here...
    );

    query
}

type BoxedNameStoreJoinQuery = IntoBoxed<'static, name_store_join::table, DBType>;

fn patient_names_visible_on_site(sync_site_id: i32) -> BoxedNameStoreJoinQuery {
    let active_stores_for_site = store::table
        .filter(store::site_id.eq(sync_site_id))
        .select(store::id.nullable());

    let mut query = name_store_join::table.into_boxed();

    query = query.filter(
        name_store_join::store_id
            .nullable()
            .eq_any(active_stores_for_site),
    );

    query
}

// This is a manual sync to fetch all records for a specific patient
// Managed via own cursor
fn create_filtered_outgoing_patient_sync_query(
    earliest: u64,
    sync_site_id: i32,
    fetch_patient_id: String,
) -> BoxedChangelogQuery {
    let mut query = create_base_query(earliest);

    let patient_names_visible_on_site =
        patient_names_visible_on_site(sync_site_id).select(name_store_join::name_id.nullable());

    query = query
        .filter(changelog::name_link_id.eq(fetch_patient_id.clone()))
        .filter(changelog::name_link_id.eq_any(patient_names_visible_on_site));

    query
}

/// Runs some DB operation with a fully locked `changelog` table.
/// This only applies for for Postgres and does nothing for Sqlite.
///
/// Motivation:
/// When querying changelog entries, ongoing transactions might continue adding changelog entries
/// to the queried range of changelogs.
/// This is because Postgres has Read Committed isolation level (instead of Serialized in Sqlite).
/// However, we assume that there will be no new changelog entries in the queried range in the
/// future, e.g. when updating the cursor position.
///
/// For example, a changelog may contain [1, 3, 4, 5] while another (slow) tx is about to commit a
/// changelog row with cursor = 2.
/// We need to wait for this changelog 2 to be added before doing the changelogs() query, otherwise
/// we might update the latest changelog cursor to 5 and the changelog with cursor = 2 will be left
/// unhandled when continuing from the latest cursor position.
///
/// Locking the changelog table will wait for ongoing writers and will prevent new writers while
/// reading the changelog.
fn with_locked_changelog_table<T, F>(
    connection: &StorageConnection,
    f: F,
) -> Result<T, RepositoryError>
where
    F: FnOnce(&mut LockedConnection) -> Result<T, RepositoryError>,
{
    if cfg!(feature = "postgres") {
        use diesel::connection::SimpleConnection;
        let result = connection.transaction_sync_etc(
            |con| {
                let mut locked_con = con.lock();
                locked_con
                    .connection()
                    .batch_execute("LOCK TABLE ONLY changelog IN ACCESS EXCLUSIVE MODE")?;

                f(&mut locked_con)
            },
            false,
        )?;

        Ok(result)
    } else {
        let mut locked_con = connection.lock();
        f(&mut locked_con)
    }
}

impl ChangelogFilter {
    pub fn new() -> Self {
        Default::default()
    }

    pub fn table_name(mut self, filter: EqualFilter<ChangelogTableName>) -> Self {
        self.table_name = Some(filter);
        self
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn action(mut self, filter: EqualFilter<RowActionType>) -> Self {
        self.action = Some(filter);
        self
    }

    pub fn is_sync_update(mut self, filter: EqualFilter<bool>) -> Self {
        self.is_sync_update = Some(filter);
        self
    }

    pub fn source_site_id(mut self, filter: EqualFilter<i32>) -> Self {
        self.source_site_id = Some(filter);
        self
    }
}

impl ChangelogTableName {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            not_equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

impl RowActionType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

use crate::dynamic_query_filter::*;

pub struct CursorAndLimit {
    pub cursor: i64,
    pub limit: i64,
}

#[derive(Debug, PartialEq)]
pub enum SyncType {
    Central,
    Remote,
}

pub enum Site {
    SiteId(i32),
    StoreIds(Vec<String>),
}

fn central_data() -> ChangelogCondition::Inner {
    let table_names = get_table_names_for_sync_types(&[SyncType::Central]);
    ChangelogCondition::table_name::any(table_names)
}

impl Site {
    // TODO once all V7 changelog queries are created, think of a better abstraction that is more readable
    // for example we would need to sync store related data when it's moved, and probably want transfer and
    // remote data to be in one place instead of split into transfer_data_for_site and remote_data_for_site
    pub fn remote_data_for_site(&self) -> ChangelogCondition::Inner {
        let table_names = get_table_names_for_sync_types(&[SyncType::Remote]);
        ChangelogCondition::And(vec![
            ChangelogCondition::table_name::any(table_names),
            match self {
                Site::SiteId(site_id) => ChangelogCondition::site_id::equal(*site_id),
                Site::StoreIds(ids) => ChangelogCondition::store_id::any(ids.clone()),
            },
        ])
    }

    pub fn all_data_for_site(&self, is_initialising: bool) -> ChangelogCondition::Inner {
        let mut or_conditions = vec![self.transfer_data_for_site(), central_data()];
        if is_initialising {
            or_conditions.push(self.remote_data_for_site());
        }

        let filter = ChangelogCondition::Or(or_conditions);
        if is_initialising {
            ChangelogCondition::And(vec![
                filter,
                ChangelogCondition::action::not_equal(RowActionType::Delete),
            ])
        } else {
            filter
        }
    }

    fn transfer_data_for_site(&self) -> ChangelogCondition::Inner {
        let table_names = get_table_names_for_sync_types(&[SyncType::Remote]);
        ChangelogCondition::And(vec![
            ChangelogCondition::table_name::any(table_names),
            match self {
                Site::SiteId(site_id) => ChangelogCondition::transfer_site_id::equal(*site_id),
                Site::StoreIds(ids) => ChangelogCondition::transfer_store_id::any(ids.clone()),
            },
        ])
    }
}

pub fn get_table_names_for_sync_types(sync_types: &[SyncType]) -> Vec<ChangelogTableName> {
    // TODO should come from main SyncType mapping for the changelog like "sync_style" method
    let all: &[(ChangelogTableName, SyncType)] = &[
        (ChangelogTableName::Unit, SyncType::Central),
        (ChangelogTableName::Currency, SyncType::Central),
        (ChangelogTableName::Name, SyncType::Central),
        (ChangelogTableName::Store, SyncType::Central),
        (ChangelogTableName::LocationType, SyncType::Central),
        (ChangelogTableName::Item, SyncType::Central),
        (ChangelogTableName::StockLine, SyncType::Remote),
        (ChangelogTableName::Invoice, SyncType::Remote),
        (ChangelogTableName::InvoiceLine, SyncType::Remote),
    ];
    all.iter()
        .filter(|(_, st)| sync_types.contains(st))
        .map(|(tn, _)| tn.clone())
        .collect()
}

pub fn get_changelogs(
    connection: &StorageConnection,
    filter: ChangelogCondition::Inner,
    CursorAndLimit { cursor, limit }: CursorAndLimit,
) -> Result<Vec<ChangelogRow>, RepositoryError> {
    let filter = ChangelogCondition::And(vec![
        filter,
        ChangelogCondition::cursor::greater_than(cursor),
    ]);

    let result: Vec<ChangelogRow> = query()
        .filter(filter.to_boxed())
        .order(changelog::cursor.asc())
        .limit(limit)
        .select(changelog::all_columns)
        .load(connection.lock().connection())?;

    Ok(result)
}

/// Max ids per IN-clause when batch-fetching rows; keeps us well below
/// SQLite's default 999-parameter limit and groups queries efficiently.
const ROW_FETCH_BATCH_SIZE: usize = 500;

/// One of the row variants that can appear in a changelog. Only the tables
/// supported by the first iteration of `get_changelogs_with_data` are listed;
/// extend this enum (and `fetch_rows_for_table`) as more tables are wired up.
#[derive(Debug, Clone)]
pub enum Row {
    Unit(UnitRow),
    Currency(CurrencyRow),
    Name(NameRow),
    Store(StoreRow),
    LocationType(LocationTypeRow),
    Item(ItemRow),
    StockLine(StockLineRow),
    Invoice(InvoiceRow),
    InvoiceLine(InvoiceLineRow),
}

/// Output entry of `get_changelogs_with_data`. `Row` carries the loaded row
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

/// Like `get_changelogs`, but additionally loads the underlying row for each
/// Upsert changelog (in batched queries grouped by table) and returns a
/// `RowOrDelete`.
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
pub fn get_changelogs_with_data(
    connection: &StorageConnection,
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

        let changelogs = get_changelogs(
            connection,
            filter.clone(),
            CursorAndLimit {
                cursor: current_cursor,
                limit: need,
            },
        )?;

        if changelogs.is_empty() {
            break;
        }

        let last_cursor = changelogs.last().map(|c| c.cursor).unwrap_or(current_cursor);

        // Within-batch dedup: keep only the latest changelog for each
        // (table_name, record_id). `get_changelogs` returns ascending by
        // cursor, so a plain insert into a HashMap does this.
        let mut batch_dedup: HashMap<(ChangelogTableName, String), ChangelogRow> = HashMap::new();
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

        let mut rows_by_table: HashMap<ChangelogTableName, HashMap<String, Row>> = HashMap::new();
        for (table_name, ids) in upsert_ids_by_table {
            let rows = fetch_rows_for_table(connection, &table_name, &ids)?;
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
                            output_by_key
                                .insert(key, RowOrDelete::Row { changelog: cl, row });
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

fn fetch_rows_for_table(
    connection: &StorageConnection,
    table_name: &ChangelogTableName,
    ids: &[String],
) -> Result<HashMap<String, Row>, RepositoryError> {
    let mut out: HashMap<String, Row> = HashMap::new();

    for chunk in ids.chunks(ROW_FETCH_BATCH_SIZE) {
        match table_name {
            ChangelogTableName::Unit => {
                for r in UnitRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Unit(r));
                }
            }
            ChangelogTableName::Currency => {
                for r in CurrencyRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Currency(r));
                }
            }
            ChangelogTableName::Name => {
                for r in NameRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Name(r));
                }
            }
            ChangelogTableName::Store => {
                for r in StoreRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::Store(r));
                }
            }
            ChangelogTableName::LocationType => {
                for r in LocationTypeRowRepository::new(connection).find_many_by_id(chunk)? {
                    out.insert(r.id.clone(), Row::LocationType(r));
                }
            }
            ChangelogTableName::Item => {
                for r in ItemRowRepository::new(connection).find_many_by_id(&chunk.to_vec())? {
                    out.insert(r.id.clone(), Row::Item(r));
                }
            }
            ChangelogTableName::StockLine => {
                for r in StockLineRowRepository::new(connection).find_many_by_ids(chunk)? {
                    out.insert(r.id.clone(), Row::StockLine(r));
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
            other => unimplemented!(
                "get_changelogs_with_data does not yet support {:?}",
                other
            ),
        }
    }

    Ok(out)
}

#[cfg(test)]
mod test {
    use super::*;
    use strum::IntoEnumIterator;
    use tokio::sync::oneshot;
    use util::assert_matches;

    use crate::{
        mock::MockDataInserts, test_db::setup_all, ClinicianRow, ClinicianRowRepository,
        ClinicianRowRepositoryTrait, RepositoryError, TransactionError,
    };

    /// Example from with_locked_changelog_table() comment
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_late_changelog_rows() {
        let (_, connection, connection_manager, _) =
            setup_all("test_late_changelog_rows", MockDataInserts::none()).await;

        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: String::from("1"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let (sender, receiver) = oneshot::channel::<()>();
        let manager_2 = connection_manager.clone();
        let process_2 = tokio::spawn(async move {
            let connection = manager_2.connection().unwrap();
            let result: Result<(), TransactionError<RepositoryError>> = connection
                .transaction_sync(|con| {
                    ClinicianRowRepository::new(con)
                        .upsert_one(&ClinicianRow {
                            id: String::from("2"),
                            is_active: true,
                            ..Default::default()
                        })
                        .unwrap();
                    sender.send(()).unwrap();
                    std::thread::sleep(core::time::Duration::from_millis(100));
                    Ok(())
                });
            result
        });
        receiver.await.unwrap();
        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: String::from("3"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let changelogs = ChangelogRepository::new(&connection)
            .changelogs(
                0,
                10,
                Some(
                    ChangelogFilter::new()
                        .table_name(EqualFilter::not_equal_to(ChangelogTableName::SystemLog)),
                ),
            )
            .unwrap();
        assert_eq!(changelogs.len(), 3);

        // being good and awaiting the task to finish orderly and check it did run fine
        process_2.await.unwrap().unwrap();
    }

    #[actix_rt::test]
    async fn changelog_enum_check() {
        let (_, connection, _, _) =
            setup_all("changelog_enum_check", MockDataInserts::none()).await;

        let repo = ChangelogRepository::new(&connection);
        // Try upsert all variants, confirm that diesel enums match postgres
        for table_name in ChangelogTableName::iter() {
            let filter = ChangelogFilter::new().table_name(table_name.equal_to());

            let result = repo.insert(&ChangeLogInsertRow {
                table_name,
                ..Default::default()
            });
            assert_matches!(result, Ok(_));

            let result = repo.changelogs(1, 100, Some(filter)).unwrap().pop();

            assert_matches!(result, Some(_));
        }
    }

    use crate::UnitRow;

    fn unit_filter() -> ChangelogCondition::Inner {
        ChangelogCondition::table_name::any(vec![ChangelogTableName::Unit])
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
        ChangelogRepository::new(connection)
            .insert(&ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            })
            .unwrap()
    }

    fn delete_unit_changelog(connection: &StorageConnection, id: &str) -> i64 {
        ChangelogRepository::new(connection)
            .insert(&ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: id.to_string(),
                row_action: RowActionType::Delete,
                ..Default::default()
            })
            .unwrap()
    }

    #[actix_rt::test]
    async fn get_changelogs_with_data_basic_mix() {
        let (_, connection, _, _) =
            setup_all("get_changelogs_with_data_basic_mix", MockDataInserts::none()).await;

        let c1 = upsert_unit(&connection, "u1");
        let c2 = upsert_unit(&connection, "u2");
        let c3 = delete_unit_changelog(&connection, "u3");

        let result = get_changelogs_with_data(
            &connection,
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
    async fn get_changelogs_with_data_dedups_and_tops_up() {
        let (_, connection, _, _) = setup_all(
            "get_changelogs_with_data_dedups_and_tops_up",
            MockDataInserts::none(),
        )
        .await;

        // Three changelogs for u1 (duplicates), one each for u2/u3.
        upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u1");
        let last_u1 = upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");
        upsert_unit(&connection, "u3");

        let result = get_changelogs_with_data(
            &connection,
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 3,
            },
        )
        .unwrap();

        // Three distinct keys, exactly limit. u1 collapsed to its latest cursor.
        assert_eq!(result.len(), 3);
        let u1 = result.iter().find(|x| x.changelog().record_id == "u1").unwrap();
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
    async fn get_changelogs_with_data_skips_missing_and_tops_up() {
        let (_, connection, _, _) = setup_all(
            "get_changelogs_with_data_skips_missing_and_tops_up",
            MockDataInserts::none(),
        )
        .await;

        // u1 exists, u2 has only a changelog (no underlying row), u3 exists.
        upsert_unit(&connection, "u1");
        ChangelogRepository::new(&connection)
            .insert(&ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u2".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            })
            .unwrap();
        upsert_unit(&connection, "u3");

        let result = get_changelogs_with_data(
            &connection,
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
    async fn get_changelogs_with_data_returns_short_when_exhausted() {
        let (_, connection, _, _) = setup_all(
            "get_changelogs_with_data_returns_short_when_exhausted",
            MockDataInserts::none(),
        )
        .await;

        upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = get_changelogs_with_data(
            &connection,
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
    async fn get_changelogs_with_data_dedups_across_iterations() {
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
            "get_changelogs_with_data_dedups_across_iterations",
            MockDataInserts::none(),
        )
        .await;

        let _c1 = upsert_unit(&connection, "u1");
        ChangelogRepository::new(&connection)
            .insert(&ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u_missing".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            })
            .unwrap();
        let c3 = upsert_unit(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = get_changelogs_with_data(
            &connection,
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 2,
            },
        )
        .unwrap();

        assert_eq!(result.len(), 2);
        let u1 = result.iter().find(|x| x.changelog().record_id == "u1").unwrap();
        // The cross-iteration replacement: u1's cursor must be C3, not C1.
        assert_eq!(u1.changelog().cursor, c3);
        assert_matches!(u1, RowOrDelete::Row { row: Row::Unit(_), .. });
    }

    #[actix_rt::test]
    async fn get_changelogs_with_data_supersedes_across_iterations() {
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
            "get_changelogs_with_data_supersedes_across_iterations",
            MockDataInserts::none(),
        )
        .await;

        upsert_unit(&connection, "u1");
        ChangelogRepository::new(&connection)
            .insert(&ChangeLogInsertRow {
                table_name: ChangelogTableName::Unit,
                record_id: "u_missing".to_string(),
                row_action: RowActionType::Upsert,
                ..Default::default()
            })
            .unwrap();
        let c3 = delete_unit_changelog(&connection, "u1");
        upsert_unit(&connection, "u2");

        let result = get_changelogs_with_data(
            &connection,
            unit_filter(),
            CursorAndLimit {
                cursor: 0,
                limit: 2,
            },
        )
        .unwrap();

        assert_eq!(result.len(), 2);
        let u1 = result.iter().find(|x| x.changelog().record_id == "u1").unwrap();
        assert_eq!(u1.changelog().cursor, c3);
        assert_matches!(u1, RowOrDelete::Delete { .. });
        let u2 = result.iter().find(|x| x.changelog().record_id == "u2").unwrap();
        assert_matches!(u2, RowOrDelete::Row { row: Row::Unit(_), .. });
    }
}
