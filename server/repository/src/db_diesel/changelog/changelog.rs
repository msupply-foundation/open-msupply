use crate::{
    diesel_macros::apply_equal_filter, DBType, EqualFilter, RepositoryError, StorageConnection,
};
use diesel::{helper_types::IntoBoxed, prelude::*};
use std::convert::TryInto;
use util::inline_init;

use diesel_derive_enum::DbEnum;

table! {
    changelog (cursor) {
        cursor -> BigInt,
        table_name -> crate::db_diesel::changelog::ChangelogTableNameMapping,
        record_id -> Text,
        row_action -> crate::db_diesel::changelog::ChangelogActionMapping,
        name_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
    }
}

table! {
    changelog_deduped (cursor) {
        cursor -> BigInt,
        table_name -> crate::db_diesel::changelog::ChangelogTableNameMapping,
        record_id -> Text,
        row_action -> crate::db_diesel::changelog::ChangelogActionMapping,
        name_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ChangelogAction {
    Upsert,
    Delete,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "snake_case"]
pub enum ChangelogTableName {
    Number,
    Location,
    StockLine,
    Invoice,
    InvoiceLine,
    Stocktake,
    StocktakeLine,
    Requisition,
    RequisitionLine,
    ActivityLog,
    InventoryAdjustmentReason,
    Clinician,
    ClinicianStoreJoin,
}

#[derive(Clone, Queryable, Debug, PartialEq, Insertable)]
#[table_name = "changelog"]
pub struct ChangelogRow {
    pub cursor: i64,
    pub table_name: ChangelogTableName,
    pub record_id: String,
    pub row_action: ChangelogAction,
    pub name_id: Option<String>,
    pub store_id: Option<String>,
}

#[derive(Default, Clone)]
pub struct ChangelogFilter {
    pub table_name: Option<EqualFilter<ChangelogTableName>>,
    pub name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
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
        let query = create_filtered_query(earliest, filter).limit(limit.into());

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query.load(&self.connection.connection)?;
        Ok(result)
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

    /// Returns latest change log
    /// After initial sync we use this method to get the latest cursor to make sure we don't try to push any records that were synced to this site on initialisation
    pub fn latest_cursor(&self) -> Result<u64, RepositoryError> {
        let result = changelog::dsl::changelog
            .select(diesel::dsl::max(changelog::dsl::cursor))
            .first::<Option<i64>>(&self.connection.connection)?;
        Ok(result.unwrap_or(0) as u64)
    }
}

type BoxedChangelogQuery = IntoBoxed<'static, changelog_deduped::table, DBType>;

fn create_filtered_query<'a>(
    earliest: u64,
    filter: Option<ChangelogFilter>,
) -> BoxedChangelogQuery {
    let mut query = changelog_deduped::dsl::changelog_deduped
        .filter(changelog_deduped::dsl::cursor.ge(earliest.try_into().unwrap_or(0)))
        .into_boxed();

    if let Some(f) = filter {
        let ChangelogFilter {
            table_name,
            name_id,
            store_id,
            record_id,
        } = f;

        apply_equal_filter!(query, table_name, changelog_deduped::dsl::table_name);
        apply_equal_filter!(query, name_id, changelog_deduped::dsl::name_id);
        apply_equal_filter!(query, store_id, changelog_deduped::dsl::store_id);
        apply_equal_filter!(query, record_id, changelog_deduped::dsl::record_id);
    }

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
}

impl ChangelogTableName {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}
