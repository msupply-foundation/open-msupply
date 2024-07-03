use crate::{
    db_diesel::store_row::store, diesel_macros::apply_equal_filter, name_link, DBType, EqualFilter,
    NameLinkRow, RepositoryError, StorageConnection,
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
        row_action -> crate::db_diesel::changelog::ChangelogActionMapping,
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
        row_action -> crate::db_diesel::changelog::ChangelogActionMapping,
        name_link_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        is_sync_update -> Bool,
        source_site_id -> Nullable<Integer>,
    }
}

joinable!(changelog_deduped -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(changelog_deduped, name_link);

#[cfg(not(feature = "postgres"))]
no_arg_sql_function!(
    last_insert_rowid,
    diesel::sql_types::BigInt,
    "Represents the SQL last_insert_row() function"
);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ChangelogAction {
    #[default]
    Upsert,
    Delete,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize, EnumIter)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
    MasterList,
    MasterListLine,
    MasterListNameJoin,
    NameTag,
    NameTagJoin,
    Unit,
    Item,
    Store,
    User,
    UserPermission,
    UserStoreJoin,
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
    #[default]
    SyncFileReference,
    Asset,
    AssetLog,
    AssetLogReason,
}

#[derive(PartialEq)]
pub enum ChangeLogSyncStyle {
    Remote,
    Central,
    File,
    Transfer,
    // Patient??  etc
}
// When adding a new change log record type, specify how it should be synced
// If new requirements are needed a different ChangeLogSyncStyle can be added

// TODO: Changelog for Central Legacy? E.g. Items etc?
impl ChangelogTableName {
    pub fn sync_style(&self) -> ChangeLogSyncStyle {
        match self {
            ChangelogTableName::Number => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Location => ChangeLogSyncStyle::Remote,
            ChangelogTableName::LocationMovement => ChangeLogSyncStyle::Remote,
            ChangelogTableName::StockLine => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Invoice => ChangeLogSyncStyle::Transfer,
            ChangelogTableName::InvoiceLine => ChangeLogSyncStyle::Transfer,
            ChangelogTableName::Stocktake => ChangeLogSyncStyle::Remote,
            ChangelogTableName::StocktakeLine => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Requisition => ChangeLogSyncStyle::Transfer,
            ChangelogTableName::RequisitionLine => ChangeLogSyncStyle::Transfer,
            ChangelogTableName::ActivityLog => ChangeLogSyncStyle::Remote,
            ChangelogTableName::InventoryAdjustmentReason => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Barcode => ChangeLogSyncStyle::Remote, //TODO: Confirm
            ChangelogTableName::Clinician => ChangeLogSyncStyle::Remote,
            ChangelogTableName::ClinicianStoreJoin => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Name => ChangeLogSyncStyle::Central, //TODO: Confirm
            ChangelogTableName::NameStoreJoin => ChangeLogSyncStyle::Central,
            ChangelogTableName::Document => ChangeLogSyncStyle::Remote, //TODO: Confirm
            ChangelogTableName::Sensor => ChangeLogSyncStyle::Remote,
            ChangelogTableName::TemperatureBreach => ChangeLogSyncStyle::Remote,
            ChangelogTableName::TemperatureBreachConfig => ChangeLogSyncStyle::Remote,
            ChangelogTableName::TemperatureLog => ChangeLogSyncStyle::Remote,
            ChangelogTableName::Currency => ChangeLogSyncStyle::Central,
            ChangelogTableName::PackVariant => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetClass => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCategory => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueType => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueItem => ChangeLogSyncStyle::Central,
            ChangelogTableName::Asset => ChangeLogSyncStyle::Remote,
            ChangelogTableName::SyncFileReference => ChangeLogSyncStyle::File,
            ChangelogTableName::AssetLog => ChangeLogSyncStyle::Remote,
            ChangelogTableName::AssetCatalogueItemProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetCatalogueProperty => ChangeLogSyncStyle::Central,
            ChangelogTableName::AssetLogReason => ChangeLogSyncStyle::Central,
            ChangelogTableName::MasterList => ChangeLogSyncStyle::Central,
            ChangelogTableName::MasterListLine => ChangeLogSyncStyle::Central,
            ChangelogTableName::MasterListNameJoin => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameTag => ChangeLogSyncStyle::Central,
            ChangelogTableName::NameTagJoin => ChangeLogSyncStyle::Central,
            ChangelogTableName::Unit => ChangeLogSyncStyle::Central,
            ChangelogTableName::Item => ChangeLogSyncStyle::Central,
            ChangelogTableName::Store => ChangeLogSyncStyle::Central,
            ChangelogTableName::User => ChangeLogSyncStyle::Central,
            ChangelogTableName::UserPermission => ChangeLogSyncStyle::Central,
            ChangelogTableName::UserStoreJoin => ChangeLogSyncStyle::Central,
        }
    }
}

#[derive(Debug, PartialEq, Insertable, Default)]
#[table_name = "changelog"]
pub struct ChangeLogInsertRow {
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: ChangelogAction,
    pub name_link_id: Option<String>,
    pub store_id: Option<String>,
}

#[derive(Clone, Queryable, Debug, PartialEq, Insertable)]
#[table_name = "changelog"]
pub struct ChangelogRow {
    pub cursor: i64,
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: ChangelogAction,
    #[column_name = "name_link_id"]
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
    pub action: Option<EqualFilter<ChangelogAction>>,
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
        let query = create_filtered_query(earliest, filter).limit(limit.into());

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogJoin> = query.load(&self.connection.connection)?;
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
    }

    pub fn count(
        &self,
        earliest: u64,
        filter: Option<ChangelogFilter>,
    ) -> Result<u64, RepositoryError> {
        let result = create_filtered_query(earliest, filter)
            .count()
            .get_result::<i64>(&self.connection.connection)?;
        Ok(result as u64)
    }

    pub fn outgoing_sync_records_from_central(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let query = create_filtered_outgoing_sync_query(earliest, sync_site_id, is_initialized)
            .order(changelog_deduped::cursor.asc())
            .limit(batch_size.into());

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogJoin> = query.load(&self.connection.connection)?;
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
    }

    pub fn outgoing_sync_records_from_central_v7(
        &self,
        earliest: u64,
        batch_size: u32,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let query = create_filtered_outgoing_sync_query_v7(earliest, sync_site_id, is_initialized)
            .order(changelog_deduped::cursor.asc())
            .limit(batch_size.into());

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogJoin> = query.load(&self.connection.connection)?;
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
            .get_result::<i64>(&self.connection.connection)?;
        Ok(result as u64)
    }

    /// This returns the number of changelog records that should be evaluated to send to the remote site when doing a v6_pull
    /// This looks up associated records to decide if change log should be sent to the site or not
    /// Update this method when adding new record types to the system
    pub fn count_outgoing_sync_records_from_central_v7(
        &self,
        earliest: u64,
        sync_site_id: i32,
        is_initialized: bool,
    ) -> Result<u64, RepositoryError> {
        let result = create_filtered_outgoing_sync_query_v7(earliest, sync_site_id, is_initialized)
            .count()
            .get_result::<i64>(&self.connection.connection)?;
        Ok(result as u64)
    }

    /// Returns latest change log
    /// After initial sync we use this method to get the latest cursor to make sure we don't try to push any records that were synced to this site on initialisation
    pub fn latest_cursor(&self) -> Result<u64, RepositoryError> {
        let result = changelog::table
            .select(diesel::dsl::max(changelog::cursor))
            .first::<Option<i64>>(&self.connection.connection)?;
        Ok(result.unwrap_or(0) as u64)
    }

    // Delete all change logs with cursor greater-equal cursor_ge
    pub fn delete(&self, cursor_ge: i64) -> Result<(), RepositoryError> {
        diesel::delete(changelog::dsl::changelog)
            .filter(changelog::dsl::cursor.ge(cursor_ge))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    // Needed for tests, when is_sync_update needs to be reset when records were inserted via
    // PullUpsertRecord (but not through sync)
    pub fn reset_is_sync_update(&self, from_cursor: u64) -> Result<(), RepositoryError> {
        diesel::update(changelog::table)
            .set(changelog::is_sync_update.eq(false))
            .filter(changelog::cursor.gt(from_cursor as i64))
            .execute(&self.connection.connection)?;
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
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn set_source_site_id_and_is_sync_update_by_record_id(
        &self,
        record_id: &str,
        source_site_id: Option<i32>,
    ) -> Result<(), RepositoryError> {
        // This is crude way of updating, updates all change logs for the record
        diesel::update(changelog::table)
            .set((
                changelog::source_site_id.eq(source_site_id),
                changelog::is_sync_update.eq(true),
            ))
            .filter(changelog::record_id.eq(record_id))
            .execute(&self.connection.connection)?;
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
            .get_results(&self.connection.connection)?
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
            .execute(&self.connection.connection)?;
        let cursor_id =
            diesel::select(last_insert_rowid).get_result::<i64>(&self.connection.connection)?;
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

    // Transfer Records
    let transfer_sync_table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
        .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::Transfer))
        .collect();

    let active_stores_for_site = store::table
        .filter(store::site_id.eq(sync_site_id))
        .select(store::id.nullable())
        .into_boxed();

    let active_names_for_site = store::table
        .filter(store::site_id.eq(sync_site_id))
        .select(store::name_id.nullable())
        .into_boxed();

    // Filter the query for the matching records for each type
    query = query.filter(
        changelog_deduped::table_name
            .eq_any(central_sync_table_names)
            .or(changelog_deduped::table_name.eq(ChangelogTableName::SyncFileReference)) // All sites get all sync file references (not necessarily files)
            .or(changelog_deduped::table_name
                .eq_any(remote_sync_table_names.clone())
                .and(changelog_deduped::store_id.eq_any(active_stores_for_site)))
            // .or(changelog_deduped::table_name
            //     .eq_any(remote_sync_table_names)
            //     .and(changelog_deduped::name_link_id.eq_any(active_names_for_site.clone()))) // TODO: Can't clone!
            .or(changelog_deduped::table_name
                .eq_any(transfer_sync_table_names)
                .and(changelog_deduped::name_link_id.eq_any(active_names_for_site))), // TODO is there a difference between transfer and remote here? are they the same?

                                                                                      // Any other special cases could be handled here...
    );

    query
}

fn create_filtered_outgoing_sync_query_v7(
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

    // Transfer Records
    let transfer_sync_table_names: Vec<ChangelogTableName> = ChangelogTableName::iter()
        .filter(|table| matches!(table.sync_style(), ChangeLogSyncStyle::Transfer))
        .collect();

    let active_stores_for_site = store::table
        .filter(store::om_site_id.eq(sync_site_id))
        .select(store::id.nullable())
        .into_boxed();

    let active_stores_for_site_for_transfers = store::table
        .filter(store::om_site_id.eq(sync_site_id))
        .select(store::id.nullable())
        .into_boxed();

    let active_names_for_site = store::table
        .filter(store::om_site_id.eq(sync_site_id))
        .select(store::name_id.nullable())
        .into_boxed();

    // Filter the query for the matching records for each type
    query = query.filter(
        changelog_deduped::table_name
            .eq_any(central_sync_table_names)
            .or(changelog_deduped::table_name.eq(ChangelogTableName::SyncFileReference)) // All sites get all sync file references (not necessarily files)
            .or(changelog_deduped::table_name
                .eq_any(remote_sync_table_names.clone())
                .and(changelog_deduped::store_id.eq_any(active_stores_for_site)))
            .or(changelog_deduped::table_name
                .eq_any(transfer_sync_table_names.clone())
                .and(changelog_deduped::store_id.eq_any(active_stores_for_site_for_transfers)))
            // .or(changelog_deduped::table_name
            //     .eq_any(remote_sync_table_names)
            //     .and(changelog_deduped::name_link_id.eq_any(active_names_for_site.clone()))) // TODO: Can't clone!
            .or(changelog_deduped::table_name
                .eq_any(transfer_sync_table_names)
                .and(changelog_deduped::name_link_id.eq_any(active_names_for_site))), // TODO is there a difference between transfer and remote here? are they the same?

                                                                                      // Any other special cases could be handled here...
    );

    query
}

// Only used in tests (cfg flag doesn't seem to work for inline_init even in tests)
impl Default for ChangelogRow {
    fn default() -> Self {
        Self {
            row_action: ChangelogAction::Upsert,
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

    pub fn action(mut self, filter: EqualFilter<ChangelogAction>) -> Self {
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

impl ChangelogAction {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}
