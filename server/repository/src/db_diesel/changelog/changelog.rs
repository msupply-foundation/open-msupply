use crate::{
    db_diesel::store_row::store, diesel_macros::apply_equal_filter,
    name_store_join::name_store_join, vaccination_row::vaccination, DBType, EqualFilter,
    LockedConnection, RepositoryError, StorageConnection,
};
use diesel::{helper_types::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};
use std::convert::TryInto;
use strum::EnumIter;
use strum::IntoEnumIterator;
use ts_rs::TS;

use diesel_derive_enum::DbEnum;

// Helper structs for raw SQL queries used by pg_max_safe_changelog_cursor
#[cfg(feature = "postgres")]
use diesel::sql_types::{BigInt, Bool, Nullable};

#[cfg(feature = "postgres")]
#[derive(QueryableByName, Debug)]
struct BoolQueryResult {
    #[diesel(sql_type = Bool)]
    result: bool,
}

#[cfg(feature = "postgres")]
#[derive(QueryableByName, Debug)]
struct SeqLastValue {
    #[diesel(sql_type = BigInt)]
    last_value: i64,
}

#[cfg(feature = "postgres")]
#[derive(QueryableByName, Debug)]
struct OptionalBigInt {
    #[diesel(sql_type = Nullable<BigInt>)]
    result: Option<i64>,
}

table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> crate::db_diesel::changelog::ChangelogTableNameMapping,
        record_id -> Text,
        row_action -> crate::db_diesel::changelog::RowActionTypeMapping,
        name_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
    }
}

table! {
    changelog_deduped (cursor) {
        cursor -> BigInt,
        table_name -> crate::db_diesel::changelog::ChangelogTableNameMapping,
        record_id -> Text,
        row_action -> crate::db_diesel::changelog::RowActionTypeMapping,
        name_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
    }
}

allow_tables_to_appear_in_same_query!(changelog_deduped, vaccination);

#[cfg(not(feature = "postgres"))]
define_sql_function!(
    fn last_insert_rowid() -> BigInt
);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, TS)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RowActionType {
    #[default]
    Upsert,
    Delete,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, EnumIter, TS)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
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

/// Controls how changelog reads protect against the cursor race condition.
/// See syncdoc/content/changelog/README.md for details on each approach.
#[derive(Debug, Clone, Copy, Default)]
pub enum ChangelogReadMode {
    /// Acquire ACCESS EXCLUSIVE table lock before reading. Blocks all concurrent
    /// operations but guarantees a complete read. Current production default.
    #[default]
    AccessExclusiveLock,
    /// Acquire EXCLUSIVE table lock. Same as ACCESS EXCLUSIVE but allows plain
    /// SELECTs (ACCESS SHARE) to proceed. Serializes changelog reads.
    ExclusiveLock,
    /// Acquire SHARE table lock. Allows concurrent changelog reads (multiple SHARE
    /// locks can coexist) but blocks writers. Risk of write starvation if readers stack.
    ShareLock,
    /// Use pg_locks to detect in-flight writers and gap detection to compute a
    /// safe cursor upper bound. No lock acquired. Prototype — see limitations.
    SafeCursorPostgres,
}

pub struct ChangelogRepository<'a> {
    connection: &'a StorageConnection,
    read_mode: ChangelogReadMode,
}

impl ChangelogReadMode {
    /// Read from CHANGELOG_READ_MODE env var. Falls back to AccessExclusiveLock.
    /// Valid values: "access_exclusive", "exclusive", "share", "safe_cursor_postgres"
    pub fn from_env() -> Self {
        match std::env::var("CHANGELOG_READ_MODE").as_deref() {
            Ok("exclusive") => Self::ExclusiveLock,
            Ok("share") => Self::ShareLock,
            Ok("safe_cursor_postgres") => Self::SafeCursorPostgres,
            _ => Self::AccessExclusiveLock,
        }
    }
}

impl<'a> ChangelogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ChangelogRepository {
            connection,
            read_mode: ChangelogReadMode::from_env(),
        }
    }

    pub fn with_read_mode(mut self, mode: ChangelogReadMode) -> Self {
        self.read_mode = mode;
        self
    }

    /// Returns changelog rows ordered by cursor in ascending order.
    /// Uses the configured `read_mode` to protect against the cursor race condition.
    ///
    /// # Arguments
    ///
    /// * `earliest` - Starting cursor (first returned changelogs may be ahead in sequence)
    /// * `limit` - Maximum number of entries to be returned
    /// * `filter` - Extra filter to apply on changelogs
    pub fn changelogs(
        &self,
        earliest: u64,
        limit: u32,
        filter: Option<ChangelogFilter>,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        self.read_changelogs(earliest, limit, |e| create_filtered_query(e, filter))
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
        self.read_changelogs(earliest, batch_size, |e| {
            create_filtered_outgoing_sync_query(e, sync_site_id, is_initialized)
        })
    }

    pub fn outgoing_patient_sync_records_from_central(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        fetch_patient_id: String,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        self.read_changelogs(earliest, batch_size, |e| {
            create_filtered_outgoing_patient_sync_query(e, sync_site_id, fetch_patient_id.clone())
        })
    }

    /// Shared implementation for all changelog read methods.
    /// Dispatches to lock-based or safe-cursor approach based on `self.read_mode`.
    fn read_changelogs<F>(
        &self,
        earliest: u64,
        limit: u32,
        build_query: F,
    ) -> Result<Vec<ChangelogRow>, RepositoryError>
    where
        F: FnOnce(u64) -> BoxedChangelogQuery,
    {
        match self.read_mode {
            ChangelogReadMode::AccessExclusiveLock
            | ChangelogReadMode::ExclusiveLock
            | ChangelogReadMode::ShareLock => {
                let lock_level = match self.read_mode {
                    ChangelogReadMode::AccessExclusiveLock => "ACCESS EXCLUSIVE",
                    ChangelogReadMode::ExclusiveLock => "EXCLUSIVE",
                    ChangelogReadMode::ShareLock => "SHARE",
                    _ => unreachable!(),
                };
                with_locked_changelog_table(self.connection, lock_level, |locked_con| {
                    let query = build_query(earliest)
                        .order(changelog_deduped::cursor.asc())
                        .limit(limit.into());
                    let result: Vec<ChangelogRow> = query.load(locked_con.connection())?;
                    Ok(result)
                })
            }
            ChangelogReadMode::SafeCursorPostgres => {
                #[cfg(feature = "postgres")]
                {
                    let safe_limit =
                        pg_max_safe_changelog_cursor(self.connection, earliest)?;
                    let mut query = build_query(earliest)
                        .order(changelog_deduped::cursor.asc())
                        .limit(limit.into());
                    if let Some(max_cursor) = safe_limit {
                        query = query.filter(changelog_deduped::cursor.le(max_cursor));
                    }
                    let result: Vec<ChangelogRow> =
                        query.load(self.connection.lock().connection())?;
                    Ok(result)
                }
                #[cfg(not(feature = "postgres"))]
                {
                    // SQLite: no concurrent writers, just read directly
                    let query = build_query(earliest)
                        .order(changelog_deduped::cursor.asc())
                        .limit(limit.into());
                    let result: Vec<ChangelogRow> =
                        query.load(self.connection.lock().connection())?;
                    Ok(result)
                }
            }
        }
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
        Ok(cursor_id)
    }
}

type BoxedChangelogQuery = IntoBoxed<'static, changelog_deduped::table, DBType>;

fn create_base_query(earliest: u64) -> BoxedChangelogQuery {
    changelog_deduped::table
        .filter(changelog_deduped::cursor.ge(earliest.try_into().unwrap_or(0)))
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

        apply_equal_filter!(query, table_name, changelog_deduped::table_name);
        apply_equal_filter!(query, name_id, changelog_deduped::name_id);
        apply_equal_filter!(query, store_id, changelog_deduped::store_id);
        apply_equal_filter!(query, record_id, changelog_deduped::record_id);
        apply_equal_filter!(query, action, changelog_deduped::row_action);
        apply_equal_filter!(query, is_sync_update, changelog_deduped::is_sync_update);
        apply_equal_filter!(query, source_site_id, changelog_deduped::source_site_id);
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
            changelog_deduped::source_site_id
                .ne(Some(sync_site_id))
                .or(changelog_deduped::source_site_id.is_null()),
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
        changelog_deduped::table_name
            .eq_any(central_sync_table_names)
            .or(changelog_deduped::table_name.eq(ChangelogTableName::SyncFileReference)) // All sites get all sync file references (not necessarily files)
            .or(changelog_deduped::table_name
                .eq_any(remote_sync_table_names)
                .and(changelog_deduped::store_id.eq_any(active_stores_for_site.into_boxed())))
            .or(changelog_deduped::table_name
                .eq_any(central_by_empty_store_id)
                .and(changelog_deduped::store_id.is_null()))
            // Special case: patient Vaccination records
            // where patient is visible, regardless of the store_id in the changelog
            .or(changelog_deduped::table_name
                .eq(ChangelogTableName::Vaccination)
                .and(changelog_deduped::name_id.eq_any(patient_names_visible_on_site))),
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
        .filter(changelog_deduped::name_id.eq(fetch_patient_id.clone()))
        .filter(changelog_deduped::name_id.eq_any(patient_names_visible_on_site));

    query
}

/// PROTOTYPE: Returns the maximum changelog cursor that is safe to read up to,
/// without requiring an ACCESS EXCLUSIVE table lock.
///
/// Strategy:
/// 1. Check pg_locks for any other backend holding RowExclusiveLock on the changelog
///    table (indicates an in-flight INSERT from a trigger, not yet committed).
/// 2. If no writers are active: all gaps in the cursor sequence are from rolled-back
///    transactions → safe to read everything visible (return None = no limit).
/// 3. If writers ARE active: get the sequence's last_value and find the first gap
///    in the cursor sequence starting from `earliest`. That gap may be an uncommitted
///    row, so return gap - 1 as the safe upper bound.
///
/// Known limitation: if there is a permanent gap from a rolled-back transaction AND
/// an unrelated active writer on the changelog table, the processor will conservatively
/// stall at the rollback gap until the active writer commits. This is transient —
/// once the writer finishes, has_writers becomes false and the gap is skipped.
#[cfg(feature = "postgres")]
fn pg_max_safe_changelog_cursor(
    connection: &StorageConnection,
    earliest: u64,
) -> Result<Option<i64>, RepositoryError> {
    use diesel::{sql_query, RunQueryDsl};

    let mut con = connection.lock();
    let pg = con.connection();

    // Step 1: Are there any other backends with an in-flight write on changelog?
    // pg_locks is cluster-wide, so filter by current database to avoid seeing
    // locks from other databases (e.g. parallel test databases).
    let has_writers = sql_query(
        "SELECT EXISTS (
            SELECT 1 FROM pg_locks l
            WHERE l.relation = 'changelog'::regclass
              AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
              AND l.mode = 'RowExclusiveLock'
              AND l.granted = true
              AND l.pid != pg_backend_pid()
        ) AS result",
    )
    .get_result::<BoolQueryResult>(pg)?
    .result;

    if !has_writers {
        return Ok(None);
    }

    // Step 2: Get the sequence's last_value (highest cursor allocated, even if uncommitted)
    let seq_last = sql_query("SELECT last_value FROM changelog_cursor_seq")
        .get_result::<SeqLastValue>(pg)?
        .last_value;

    // Step 3: Get the max visible cursor
    let max_visible = sql_query("SELECT MAX(cursor) AS result FROM changelog")
        .get_result::<OptionalBigInt>(pg)?
        .result;

    let max_visible = match max_visible {
        Some(v) => v,
        None => return Ok(Some(0)), // No visible rows at all
    };

    // Step 4: Find the first gap in visible cursors between earliest and seq_last.
    // A gap is a cursor value c where c-1 exists but c doesn't (or where the first
    // visible cursor is above earliest, meaning there's a gap at the start).
    //
    // We only look for gaps between consecutive VISIBLE rows — not from `earliest`
    // itself, because `earliest` may be 0 or any value before the first real cursor.
    // Instead, find the first visible row >= earliest and look for gaps after it.
    let first_gap = sql_query(
        "SELECT c.cursor + 1 AS result
         FROM changelog c
         WHERE c.cursor >= $1::bigint
           AND c.cursor < $2::bigint
           AND NOT EXISTS (SELECT 1 FROM changelog c2 WHERE c2.cursor = c.cursor + 1)
         ORDER BY c.cursor
         LIMIT 1",
    )
    .bind::<BigInt, _>(earliest as i64)
    .bind::<BigInt, _>(seq_last)
    .get_result::<OptionalBigInt>(pg)
    .optional()?
    .and_then(|r| r.result);

    match first_gap {
        Some(gap) if gap <= seq_last => {
            // Gap found — could be an in-flight insert. Safe up to gap - 1.
            Ok(Some(gap - 1))
        }
        _ => {
            // No gaps between visible rows, but sequence may be ahead of max_visible
            // (meaning there are uncommitted rows at the high end)
            if seq_last > max_visible {
                Ok(Some(max_visible))
            } else {
                Ok(None) // Everything visible, no gaps, safe to read all
            }
        }
    }
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
    lock_level: &str,
    f: F,
) -> Result<T, RepositoryError>
where
    F: FnOnce(&mut LockedConnection) -> Result<T, RepositoryError>,
{
    if cfg!(feature = "postgres") {
        use diesel::connection::SimpleConnection;
        let lock_sql = format!("LOCK TABLE ONLY changelog IN {} MODE", lock_level);
        let result = connection.transaction_sync_etc(
            |con| {
                let mut locked_con = con.lock();
                locked_con.connection().batch_execute(&lock_sql)?;

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

    /// Core test: 3 clinicians inserted concurrently. Clinician 2's transaction
    /// is held open, so its changelog cursor is allocated but not visible.
    /// After the slow tx commits, all 3 must be returned.
    ///
    /// Behavior differs by mode:
    /// - Lock: blocks until slow tx commits, returns all 3 in one call
    /// - SafeCursorPostgres: returns 1 while tx is open, then 3 after commit
    #[cfg(feature = "postgres")]
    async fn concurrent_write_test(test_name: &str, mode: ChangelogReadMode) {
        let (_, connection, connection_manager, _) =
            setup_all(test_name, MockDataInserts::none()).await;

        // Record starting cursor so we only look at rows we create
        let start_cursor =
            ChangelogRepository::new(&connection).latest_cursor().unwrap() + 1;

        // Step 1: Insert clinician 1 — commits immediately
        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: String::from("1"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        // Step 2: Start a slow transaction that inserts clinician 2 but delays commit.
        // This simulates a long-running sync or bulk operation.
        let (inserted_sender, inserted_receiver) = oneshot::channel::<()>();
        let (proceed_sender, proceed_receiver) = std::sync::mpsc::channel::<()>();
        let manager_2 = connection_manager.clone();
        let slow_tx = tokio::spawn(async move {
            let connection = manager_2.connection().unwrap();
            let result: Result<(), TransactionError<RepositoryError>> =
                connection.transaction_sync(|con| {
                    ClinicianRowRepository::new(con)
                        .upsert_one(&ClinicianRow {
                            id: String::from("2"),
                            is_active: true,
                            ..Default::default()
                        })
                        .unwrap();
                    // Signal: row inserted, cursor allocated, but tx still open
                    inserted_sender.send(()).unwrap();
                    // Block until told to proceed — simulating a slow transaction
                    proceed_receiver.recv().unwrap();
                    Ok(())
                });
            result
        });
        // Wait for clinician 2 to be inserted (but NOT committed)
        inserted_receiver.await.unwrap();

        // Step 3: Insert clinician 3 — commits immediately (gets cursor after 2)
        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: String::from("3"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let filter = Some(
            ChangelogFilter::new()
                .table_name(EqualFilter::not_equal_to(ChangelogTableName::SystemLog)),
        );
        let repo = ChangelogRepository::new(&connection).with_read_mode(mode);

        // While slow tx is open: SafeCursorPostgres returns only rows before the gap,
        // Lock mode would block here (so we skip this assertion for Lock).
        if matches!(mode, ChangelogReadMode::SafeCursorPostgres) {
            let changelogs_during =
                repo.changelogs(start_cursor, 10, filter.clone()).unwrap();
            assert_eq!(
                changelogs_during.len(), 1,
                "[{mode:?}] While tx open, expected 1 row, got {}: {:?}",
                changelogs_during.len(),
                changelogs_during.iter().map(|c| c.cursor).collect::<Vec<_>>()
            );
        }

        // Step 4: Release the slow transaction
        proceed_sender.send(()).unwrap();
        slow_tx.await.unwrap().unwrap();

        // After commit: all 3 must be visible regardless of mode
        let changelogs_after = repo.changelogs(start_cursor, 10, filter).unwrap();
        assert_eq!(
            changelogs_after.len(), 3,
            "[{mode:?}] After commit, expected 3 rows, got {}: {:?}",
            changelogs_after.len(),
            changelogs_after.iter().map(|c| c.cursor).collect::<Vec<_>>()
        );
    }

    /// Core test: a rolled-back transaction creates a permanent gap in the cursor
    /// sequence. Both modes must return all visible rows (skipping the gap).
    #[cfg(feature = "postgres")]
    async fn rollback_gap_test(test_name: &str, mode: ChangelogReadMode) {
        let (_, connection, connection_manager, _) =
            setup_all(test_name, MockDataInserts::none()).await;

        // Record starting cursor so we only look at rows we create
        let start_cursor =
            ChangelogRepository::new(&connection).latest_cursor().unwrap() + 1;

        // Insert clinician 1 — commits
        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: String::from("1"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        // Insert clinician 2 in a transaction that rolls back — creates permanent gap
        let manager_2 = connection_manager.clone();
        let rollback_tx = tokio::spawn(async move {
            let connection = manager_2.connection().unwrap();
            let _: Result<(), TransactionError<RepositoryError>> =
                connection.transaction_sync(|con| {
                    ClinicianRowRepository::new(con)
                        .upsert_one(&ClinicianRow {
                            id: String::from("2"),
                            is_active: true,
                            ..Default::default()
                        })
                        .unwrap();
                    // Force rollback by returning an error
                    Err(RepositoryError::UniqueViolation(
                        "intentional rollback".into(),
                    ))
                });
        });
        rollback_tx.await.unwrap();

        // Insert clinician 3 — commits (with permanent gap where clinician 2 was)
        ClinicianRowRepository::new(&connection)
            .upsert_one(&ClinicianRow {
                id: String::from("3"),
                is_active: true,
                ..Default::default()
            })
            .unwrap();

        let filter = Some(
            ChangelogFilter::new()
                .table_name(EqualFilter::not_equal_to(ChangelogTableName::SystemLog)),
        );
        let repo = ChangelogRepository::new(&connection).with_read_mode(mode);

        // Both visible rows should be returned — the gap from rollback should not block
        let changelogs = repo.changelogs(start_cursor, 10, filter).unwrap();
        assert_eq!(
            changelogs.len(), 2,
            "[{mode:?}] After rollback, expected 2 visible rows, got {}: {:?}",
            changelogs.len(),
            changelogs.iter().map(|c| c.cursor).collect::<Vec<_>>()
        );
    }

    // --- Test entry points: one per (scenario, mode) combination ---

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_concurrent_write_lock() {
        concurrent_write_test(
            "test_concurrent_write_lock",
            ChangelogReadMode::AccessExclusiveLock,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_concurrent_write_exclusive_lock() {
        concurrent_write_test(
            "test_concurrent_write_exclusive_lock",
            ChangelogReadMode::ExclusiveLock,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_concurrent_write_share_lock() {
        concurrent_write_test(
            "test_concurrent_write_share_lock",
            ChangelogReadMode::ShareLock,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_concurrent_write_safe_cursor() {
        concurrent_write_test(
            "test_concurrent_write_safe_cursor",
            ChangelogReadMode::SafeCursorPostgres,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_rollback_gap_lock() {
        rollback_gap_test(
            "test_rollback_gap_lock",
            ChangelogReadMode::AccessExclusiveLock,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_rollback_gap_exclusive_lock() {
        rollback_gap_test(
            "test_rollback_gap_exclusive_lock",
            ChangelogReadMode::ExclusiveLock,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_rollback_gap_share_lock() {
        rollback_gap_test(
            "test_rollback_gap_share_lock",
            ChangelogReadMode::ShareLock,
        ).await;
    }

    #[cfg(feature = "postgres")]
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_rollback_gap_safe_cursor() {
        rollback_gap_test(
            "test_rollback_gap_safe_cursor",
            ChangelogReadMode::SafeCursorPostgres,
        ).await;
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
