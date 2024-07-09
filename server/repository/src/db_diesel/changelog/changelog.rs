use crate::{
    db_diesel::store_row::store, diesel_macros::apply_equal_filter, name_link, DBType, EqualFilter,
    LockedConnection, NameLinkRow, RepositoryError, StorageConnection,
};
use diesel::{
    helper_types::{IntoBoxed, LeftJoin},
    prelude::*,
};
use serde::{Deserialize, Serialize};
use std::convert::TryInto;
use strum::EnumIter;
use strum::IntoEnumIterator;
use util::inline_init;

use diesel_derive_enum::DbEnum;

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
        name_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
    }
}

joinable!(changelog_deduped -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(changelog_deduped, name_link);

#[cfg(not(feature = "postgres"))]
define_sql_function!(
    fn last_insert_rowid() -> BigInt
);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RowActionType {
    #[default]
    Upsert,
    Delete,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, EnumIter)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
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
    InventoryAdjustmentReason,
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
}

pub(crate) enum ChangeLogSyncStyle {
    Legacy,
    Central,
    Remote,
    File,
    // Transfer,
    // Patient??  etc
}
// When adding a new change log record type, specify how it should be synced
// If new requirements are needed a different ChangeLogSyncStyle can be added
impl ChangelogTableName {
    pub(crate) fn sync_style(&self) -> ChangeLogSyncStyle {
        match self {
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
            ChangelogTableName::InventoryAdjustmentReason => ChangeLogSyncStyle::Legacy,
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
        }
    }
}

#[derive(Debug, PartialEq, Insertable, Default)]
#[diesel(table_name = changelog)]
pub struct ChangeLogInsertRow {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: RowActionType,
    pub name_link_id: Option<String>,
    pub store_id: Option<String>,
}

#[derive(Clone, Queryable, Debug, PartialEq, Insertable)]
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

#[derive(Default, Clone)]
pub struct ChangelogFilter {
    pub table_name: Option<EqualFilter<ChangelogTableName>>,
    pub name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
    pub action: Option<EqualFilter<RowActionType>>,
    pub is_sync_update: Option<EqualFilter<bool>>,
    pub source_site_id: Option<EqualFilter<i32>>,
}

pub struct ChangelogRepository<'a> {
    connection: &'a StorageConnection,
}

type ChangelogJoin = (ChangelogRow, Option<NameLinkRow>);

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
                .order(changelog_deduped::dsl::cursor.asc())
                .limit(limit.into());

            // // Debug diesel query
            // println!(
            //     "{}",
            //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
            // );

            let result: Vec<ChangelogJoin> = query.load(locked_con.connection())?;
            Ok(result
                .into_iter()
                .map(|(change_log_row, name_link_row)| ChangelogRow {
                    cursor: change_log_row.cursor,
                    table_name: change_log_row.table_name,
                    record_id: change_log_row.record_id,
                    row_action: change_log_row.row_action,
                    name_id: name_link_row.map(|r| r.name_id),
                    store_id: change_log_row.store_id,
                    is_sync_update: change_log_row.is_sync_update,
                    source_site_id: change_log_row.source_site_id,
                })
                .collect())
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
                .order(changelog_deduped::cursor.asc())
                .limit(batch_size.into());

            // Debug diesel query
            // println!(
            //     "{}",
            //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
            // );

            let result: Vec<ChangelogJoin> = query.load(locked_con.connection())?;
            Ok(result
                .into_iter()
                .map(|(change_log_row, name_link_row)| ChangelogRow {
                    cursor: change_log_row.cursor,
                    table_name: change_log_row.table_name,
                    record_id: change_log_row.record_id,
                    row_action: change_log_row.row_action,
                    name_id: name_link_row.map(|r| r.name_id),
                    store_id: change_log_row.store_id,
                    is_sync_update: change_log_row.is_sync_update,
                    source_site_id: change_log_row.source_site_id,
                })
                .collect())
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

type BoxedChangelogQuery =
    IntoBoxed<'static, LeftJoin<changelog_deduped::table, name_link::table>, DBType>;

fn create_filtered_query(earliest: u64, filter: Option<ChangelogFilter>) -> BoxedChangelogQuery {
    let mut query = changelog_deduped::table
        .left_join(name_link::table)
        .filter(changelog_deduped::cursor.ge(earliest.try_into().unwrap_or(0)))
        .into_boxed();

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
        apply_equal_filter!(query, name_id, name_link::name_id);
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
    let mut query = changelog_deduped::table
        .left_join(name_link::table)
        .filter(changelog_deduped::cursor.ge(earliest.try_into().unwrap_or(0)))
        .into_boxed();

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
        .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::Remote))
        .collect();

    let active_stores_for_site = store::table
        .filter(store::site_id.eq(sync_site_id))
        .select(store::id.nullable())
        .into_boxed();

    // Filter the query for the matching records for each type
    query = query.filter(
        changelog_deduped::table_name
            .eq_any(central_sync_table_names)
            .or(changelog_deduped::table_name.eq(ChangelogTableName::SyncFileReference)) // All sites get all sync file references (not necessarily files)
            .or(changelog_deduped::table_name
                .eq_any(remote_sync_table_names)
                .and(changelog_deduped::store_id.eq_any(active_stores_for_site))),
        // Any other special cases could be handled here...
    );

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

// Only used in tests (cfg flag doesn't seem to work for inline_init even in tests)
impl Default for ChangelogRow {
    fn default() -> Self {
        Self {
            row_action: RowActionType::Upsert,
            table_name: ChangelogTableName::Invoice,
            // Default
            cursor: Default::default(),
            record_id: Default::default(),
            name_id: Default::default(),
            store_id: Default::default(),
            is_sync_update: Default::default(),
            source_site_id: Default::default(),
        }
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
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}

impl RowActionType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}

#[cfg(test)]
mod test {
    use tokio::sync::oneshot;
    use util::inline_init;

    use crate::{
        mock::MockDataInserts, test_db::setup_all, ChangelogRepository, ClinicianRow,
        ClinicianRowRepository, RepositoryError, TransactionError,
    };

    /// Example from with_locked_changelog_table() comment
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn test_late_changelog_rows() {
        let (_, connection, connection_manager, _) =
            setup_all("test_late_changelog_rows", MockDataInserts::none()).await;

        ClinicianRowRepository::new(&connection)
            .upsert_one(&inline_init(|r: &mut ClinicianRow| {
                r.id = String::from("1");
                r.is_active = true;
            }))
            .unwrap();

        let (sender, receiver) = oneshot::channel::<()>();
        let manager_2 = connection_manager.clone();
        let process_2 = tokio::spawn(async move {
            let connection = manager_2.connection().unwrap();
            let result: Result<(), TransactionError<RepositoryError>> = connection
                .transaction_sync(|con| {
                    ClinicianRowRepository::new(con)
                        .upsert_one(&inline_init(|r: &mut ClinicianRow| {
                            r.id = String::from("2");
                            r.is_active = true;
                        }))
                        .unwrap();
                    sender.send(()).unwrap();
                    std::thread::sleep(core::time::Duration::from_millis(100));
                    Ok(())
                });
            result
        });
        receiver.await.unwrap();
        ClinicianRowRepository::new(&connection)
            .upsert_one(&inline_init(|r: &mut ClinicianRow| {
                r.id = String::from("3");
                r.is_active = true;
            }))
            .unwrap();

        let changelogs = ChangelogRepository::new(&connection)
            .changelogs(0, 10, None)
            .unwrap();
        assert_eq!(changelogs.len(), 3);

        // being good and awaiting the task to finish orderly and check it did run fine
        process_2.await.unwrap().unwrap();
    }
}
