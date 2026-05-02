use crate::{
    db_diesel::store_row::store,
    diesel_macros::{apply_equal_filter, diesel_string_enum},
    dynamic_query_filter::create_condition,
    name_store_join::name_store_join,
    vaccination_row::vaccination,
    DBType, EqualFilter, KeyValueStoreRepository, LockedConnection, RepositoryError,
    StorageConnection, TransactionNotification,
};
use diesel::{dsl::LeftJoinQuerySource, helper_types::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};
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
allow_tables_to_appear_in_same_query!(changelog, name_store_join);

diesel::alias!(
    store as transfer_stores: TransferStores,
    store as patient_stores: PatientStore,
);

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
        .left_join(
            name_store_join::table.on(name_store_join::name_id
                .nullable()
                .eq(changelog::patient_id)),
        )
        .left_join(
            patient_stores.on(patient_stores
                .field(store::id)
                .nullable()
                .eq(name_store_join::store_id.nullable())),
        )
}

// Expand macro recurseively for auto_type, hen replace "diesel::dsl::LeftJoin" with "LeftJoinQuerySource"
// And then remove diesel::dsl::On< keeping what's inside here >
type Source = LeftJoinQuerySource<
    LeftJoinQuerySource<
        LeftJoinQuerySource<
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
        >,
        name_store_join::table,
        diesel::dsl::Eq<diesel::dsl::Nullable<name_store_join::name_id>, changelog::patient_id>,
    >,
    patient_stores,
    diesel::dsl::Eq<
        diesel::dsl::Nullable<diesel::dsl::Field<patient_stores, store::id>>,
        diesel::dsl::Nullable<name_store_join::store_id>,
    >,
>;

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
    #[derive(Clone, Eq, Serialize, Deserialize, strum::EnumIter, TS)]
    #[strum(serialize_all = "snake_case")]
    // Variants are grouped by `sync_style()` and sorted alphabetically within each group.
    // Keep this layout in sync with the match in `sync_style` below.
    pub enum ChangelogTableName {
        // ---- Legacy — Remote (not v6) ----
        ActivityLog,
        Barcode,
        Clinician,
        ClinicianStoreJoin,
        Currency,
        Document,
        IndicatorValue,
        InsuranceProvider,
        Item,
        Location,
        LocationMovement,
        Name,
        NameInsuranceJoin,
        NameStoreJoin,
        Number,
        PurchaseOrder,
        PurchaseOrderLine,
        Sensor,
        StockLine,
        Stocktake,
        StocktakeLine,
        TemperatureBreach,
        TemperatureBreachConfig,
        TemperatureLog,
        VVMStatusLog,

        // ---- Legacy — Remote + Transfer (not v6) ----
        Requisition,
        RequisitionLine,

        // ---- Legacy — Remote + Transfer + Patient (not v6) ----
        Invoice,
        InvoiceLine,

        // ---- Central (v6) ----
        AssetCatalogueItem,
        AssetCatalogueItemProperty,
        AssetCatalogueProperty,
        AssetCatalogueType,
        AssetCategory,
        AssetClass,
        AssetLogReason,
        AssetProperty,
        BackendPlugin,
        BundledItem,
        Campaign,
        Demographic,
        FormSchema,
        FrontendPlugin,
        ItemVariant,
        NameOmsFields,
        NameProperty,
        PackVariant,
        PackagingVariant,
        Property,
        Report,
        VaccineCourse,
        VaccineCourseDose,
        VaccineCourseItem,
        VaccineCourseStoreConfig,

        // ---- Central (not v6) ----
        LocationType,
        MasterList,
        Store,
        Unit,

        // ---- ToLegacyCentralOnly (not v6) ----
        Site,

        // ---- Remote (v6) ----
        Asset,
        AssetInternalLocation,
        AssetLog,
        Encounter,
        RnrForm,
        RnrFormLine,
        SyncMessage,
        Vaccination,

        // ---- File (v6) ----
        #[default]
        SyncFileReference,

        // ---- RemoteAndCentral (v6) ----
        PluginData,
        Preference,

        // ---- RemoteToCentral (v6) ----
        ContactForm,
        SystemLog,
    }
}

pub(crate) enum SourceSiteId {
    SourceSiteId(Option<i32>),
    CurrentSiteId,
}

pub(crate) enum RowOrId<'a, T> {
    Row(&'a T),
    Id(&'a str),
}

impl SourceSiteId {
    pub(crate) fn get_id(
        &self,
        connection: &StorageConnection,
    ) -> Result<Option<i32>, RepositoryError> {
        match self {
            SourceSiteId::SourceSiteId(id) => Ok(*id),
            SourceSiteId::CurrentSiteId => {
                KeyValueStoreRepository::new(connection).get_current_site_id()
            }
        }
    }
}

#[derive(strum::EnumIter, PartialEq, Eq, Debug)]
pub(crate) enum ChangeLogSyncStyle {
    Central, // Data created on Open-mSupply central server
    Remote,
    File,
    ToLegacyCentralOnly,
    Transfer,
    Patient,
    RemoteToCentral, // These records won't sync back to the remote site on re-initalisation
}

fn v6() -> bool {
    true
}
fn not_v6() -> bool {
    false
}
// When adding a new change log record type, specify how it should be synced
// If new requirements are needed a different ChangeLogSyncStyle can be added
//
// Variants are grouped to match the order of `ChangelogTableName` above and
// sorted alphabetically within each group. Keep the two in sync.
impl ChangelogTableName {
    pub(crate) fn sync_style(&self) -> (Vec<ChangeLogSyncStyle>, bool /* is v6 */) {
        use ChangeLogSyncStyle::*;
        use ChangelogTableName::*;
        match self {
            // ----------------------------------------------------------
            // Legacy — Remote (not v6)
            // ----------------------------------------------------------
            ActivityLog
            | Barcode
            | Clinician
            | ClinicianStoreJoin
            | Currency
            | Document
            | IndicatorValue
            | InsuranceProvider
            | Item
            | Location
            | LocationMovement
            | Name
            | NameInsuranceJoin
            | NameStoreJoin
            | Number
            | PurchaseOrder
            | PurchaseOrderLine
            | Sensor
            | StockLine
            | Stocktake
            | StocktakeLine
            | TemperatureBreach
            | TemperatureBreachConfig
            | TemperatureLog
            | VVMStatusLog => (vec![Remote], not_v6()),

            // ----------------------------------------------------------
            // Legacy — Remote + Transfer (not v6)
            // ----------------------------------------------------------
            Requisition | RequisitionLine => (vec![Remote, Transfer], not_v6()),

            // ----------------------------------------------------------
            // Legacy — Remote + Transfer + Patient (not v6)
            // ----------------------------------------------------------
            Invoice | InvoiceLine => (vec![Remote, Transfer, Patient], not_v6()),

            // ----------------------------------------------------------
            // Central (v6) — created on the Open-mSupply central server
            // ----------------------------------------------------------
            AssetCatalogueItem
            | AssetCatalogueItemProperty
            | AssetCatalogueProperty
            | AssetCatalogueType
            | AssetCategory
            | AssetClass
            | AssetLogReason
            | AssetProperty
            | BackendPlugin
            | BundledItem
            | Campaign
            | Demographic
            | FormSchema
            | FrontendPlugin
            | ItemVariant
            | NameOmsFields
            | NameProperty
            | PackVariant
            | PackagingVariant
            | Property
            | Report
            | VaccineCourse
            | VaccineCourseDose
            | VaccineCourseItem
            | VaccineCourseStoreConfig => (vec![Central], v6()),

            // ----------------------------------------------------------
            // Central (not v6) — central data synced via legacy mSupply
            // ----------------------------------------------------------
            LocationType | MasterList | Store | Unit => (vec![Central], not_v6()),

            // ----------------------------------------------------------
            // ToLegacyCentralOnly (not v6)
            // ----------------------------------------------------------
            Site => (vec![ToLegacyCentralOnly], not_v6()),

            // ----------------------------------------------------------
            // Remote (v6) — store-scoped data that syncs to the owning site
            // ----------------------------------------------------------
            Asset
            | AssetInternalLocation
            | AssetLog
            | Encounter
            | RnrForm
            | RnrFormLine
            | SyncMessage
            | Vaccination => (vec![Remote], v6()),

            // ----------------------------------------------------------
            // File (v6) — file references (handled by the file-sync pipeline)
            // ----------------------------------------------------------
            SyncFileReference => (vec![File], v6()),

            // ----------------------------------------------------------
            // RemoteAndCentral (v6) — Remote when store_id is set, otherwise Central
            // ----------------------------------------------------------
            PluginData | Preference => (vec![Remote, Central], v6()),

            // ----------------------------------------------------------
            // RemoteToCentral (v6) — pushed to central but not synced back on re-init
            // ----------------------------------------------------------
            ContactForm | SystemLog => (vec![RemoteToCentral], v6()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogInsertRow {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    pub store_id: Option<String>,
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

    pub fn insert(&self, row: &ChangeLogInsertRow) -> Result<(), RepositoryError> {
        diesel::insert_into(changelog::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
    }

    pub fn batch_insert(&self, rows: Vec<ChangeLogInsertRow>) -> Result<(), RepositoryError> {
        //TODO: Need to handle batch insert size limit
        diesel::insert_into(changelog::table)
            .values(rows)
            .execute(self.connection.lock().connection())?;
        self.connection
            .notify(TransactionNotification::ChangelogInsert);
        Ok(())
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
    (patient_site_id, i32, patient_stores.field(store::site_id)),
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

    // // If we are initialising, we want to send all the records for the site, even ones that originally came from the site
    // // The rest of the time we want to exclude any records that were created by the site
    // if is_initialized {
    //     query = query.filter(
    //         changelog::source_site_id
    //             .ne(Some(sync_site_id))
    //             .or(changelog::source_site_id.is_null()),
    //     )
    // }

    // // Loop through all the Sync tables and add them to the query if they have the right sync style

    // // Central Records
    // let central_sync_table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
    //     .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::Central))
    //     .collect();

    // // Remote Records
    // let remote_sync_table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
    //     .filter(|table| {
    //         matches!(
    //             table.sync_style(),
    //             ChangeLogSyncStyle::Remote | ChangeLogSyncStyle::RemoteAndCentral
    //         )
    //     })
    //     .collect();

    // // Central record where store id is null
    // let central_by_empty_store_id: Vec<ChangelogTableName> = ChangelogTableName::iter()
    //     .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::RemoteAndCentral))
    //     .collect();

    // let active_stores_for_site = store::table
    //     .filter(store::site_id.eq(sync_site_id))
    //     .select(store::id.nullable());

    // let patient_names_visible_on_site =
    //     patient_names_visible_on_site(sync_site_id).select(name_store_join::name_id.nullable());

    // // Filter the query for the matching records for each type
    // query = query.filter(
    //     changelog::table_name
    //         .eq_any(central_sync_table_names)
    //         .or(changelog::table_name.eq(ChangelogTableName::SyncFileReference)) // All sites get all sync file references (not necessarily files)
    //         .or(changelog::table_name
    //             .eq_any(remote_sync_table_names)
    //             .and(changelog::store_id.eq_any(active_stores_for_site.into_boxed())))
    //         .or(changelog::table_name
    //             .eq_any(central_by_empty_store_id)
    //             .and(changelog::store_id.is_null()))
    //         // Special case: patient Vaccination records
    //         // where patient is visible, regardless of the store_id in the changelog
    //         .or(changelog::table_name
    //             .eq(ChangelogTableName::Vaccination)
    //             .and(changelog::name_link_id.eq_any(patient_names_visible_on_site))),
    //     // Any other special cases could be handled here...
    // );

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

pub fn all_data_edited_on_site(site_id: i32) -> ChangelogCondition::Inner {
    ChangelogCondition::source_site_id::equal(site_id)
}

pub fn all_data_for_site(site_id: i32, is_initialising: bool) -> ChangelogCondition::Inner {
    // TODO can optimise, not filter at all by remote data when initialising
    use ChangeLogSyncStyle::*;
    use ChangelogCondition as C;
    let mut inner_or_conditions = vec![];
    for sync_style in ChangeLogSyncStyle::iter() {
        let table_names = get_table_names_for_sync_style(&sync_style, None);
        let pre_condition = C::table_name::any(table_names);

        let condition = match sync_style {
            Central | File => C::And(vec![
                // We have central and remote records with same table_name, so need to make sure to include only central ones (where store_id is null)
                C::store_id::is_null(),
            ]),
            ToLegacyCentralOnly | RemoteToCentral => {
                // Don't sync
                continue;
            }
            Remote => C::site_id::equal(site_id),
            Transfer => C::transfer_site_id::equal(site_id),
            Patient => C::patient_site_id::equal(site_id),
        };

        inner_or_conditions.push(C::And(vec![pre_condition, condition]));
    }

    let mut outer_and_condition = vec![C::Or(inner_or_conditions)];
    if !is_initialising {
        outer_and_condition.push(C::source_site_id::not_equal(site_id));
    }

    C::And(outer_and_condition)
}

pub fn get_table_names_for_sync_style(
    sync_style: &ChangeLogSyncStyle,
    is_v6_option: Option<bool>,
) -> Vec<ChangelogTableName> {
    ChangelogTableName::iter()
        .filter(|table| {
            let (styles, is_v6) = table.sync_style();
            if is_v6_option == Some(true) && !is_v6 {
                return false;
            }
            styles.iter().any(|style| style == sync_style)
        })
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

    let query = query()
        .filter(filter.to_boxed())
        .order(changelog::cursor.asc())
        .limit(limit)
        .select(changelog::all_columns);

    // Debug diesel query
    // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());
    let result: Vec<ChangelogRow> = query.load(connection.lock().connection())?;

    Ok(result)
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
}
