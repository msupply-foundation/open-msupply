use crate::db_diesel::changelog::changelog::RowOrId;
use crate::diesel_macros::{define_linked_tables, diesel_string_enum};
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RepositoryError, RowActionType, SourceSiteId,
    StorageConnection, Upsert,
};

use super::{item_link_row::item_link, item_row::item, store_row::store};

use chrono::NaiveDate;
use diesel::prelude::*;

diesel_string_enum! {
    db_case = SCREAMING_SNAKE_CASE;
    #[derive(Clone, Eq)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    // What the rows' quantities were entered for, and so how they group back into
    // estimates. Stored as plain TEXT so a type added on a newer central syncs to an
    // older site as `Other(String)` rather than failing.
    pub enum ConsumptionEstimateType {
        /// A quantity per calendar month: the rows dated in a month are the pieces
        /// of that month's estimate
        #[default]
        Monthly,
        #[strum(default, transparent)]
        Other(String),
    }
}

// Estimated consumption for a store, added on top of real consumption by the
// `consumption` view. Each row is a quantity used on a date, like any row of that
// view: one week-long piece of an estimate, dated at its midpoint, with its share of
// the estimate's quantity. `type` says what the estimates were entered for (a
// calendar month), so how the rows group back into them. Authored on central and
// synced to the store's site.
define_linked_tables! {
    view: consumption_estimate = "consumption_estimate_view",
    core: consumption_estimate_with_links = "consumption_estimate",
    struct: ConsumptionEstimateRow,
    repo: ConsumptionEstimateRowRepository,
    shared: {
        store_id -> Text,
        #[sql_name = "type"] type_ -> diesel::sql_types::Text,
        date -> Date,
        quantity -> Double,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {}
}

joinable!(consumption_estimate -> item (item_id));
joinable!(consumption_estimate -> store (store_id));
joinable!(consumption_estimate_with_links -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(consumption_estimate, item);
allow_tables_to_appear_in_same_query!(consumption_estimate, store);

#[derive(Clone, Queryable, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[diesel(table_name = consumption_estimate)]
pub struct ConsumptionEstimateRow {
    pub id: String,
    pub store_id: String,
    #[diesel(column_name = type_)]
    pub r#type: ConsumptionEstimateType,
    /// The midpoint of this piece: the date the `consumption` view gives it
    pub date: NaiveDate,
    /// This piece's share of the estimate's quantity, in units
    pub quantity: f64,
    // Resolved from link tables - must be last to match view column order
    pub item_id: String,
}

pub struct ConsumptionEstimateRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ConsumptionEstimateRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ConsumptionEstimateRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ConsumptionEstimateRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = ConsumptionEstimateRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        // Before the delete: the changelog reads the row for its store
        let changelog = ConsumptionEstimateRow::generate_changelog(
            RowOrId::Id(id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        diesel::delete(
            consumption_estimate_with_links::table
                .filter(consumption_estimate_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Deletes the rows in one statement, each with its own changelog entry so the
    /// delete syncs
    pub fn delete_many(&self, ids: &[String]) -> Result<(), RepositoryError> {
        for chunk in ids.chunks(500) {
            // Before the delete: the changelog reads each row for its store
            let changelogs = self
                .find_many_by_id(chunk)?
                .iter()
                .map(|row| {
                    ConsumptionEstimateRow::generate_changelog(
                        RowOrId::Row(row),
                        self.connection,
                        RowActionType::Delete,
                        SourceSiteId::CurrentSiteId,
                    )
                })
                .collect::<Result<Vec<_>, _>>()?;
            ChangelogRepository::new(self.connection).batch_insert(changelogs)?;
            diesel::delete(
                consumption_estimate_with_links::table
                    .filter(consumption_estimate_with_links::id.eq_any(chunk)),
            )
            .execute(self.connection.lock().connection())?;
        }
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<ConsumptionEstimateRow>, RepositoryError> {
        let result = consumption_estimate::table
            .filter(consumption_estimate::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ConsumptionEstimateRow>, RepositoryError> {
        Ok(consumption_estimate::table
            .filter(consumption_estimate::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    /// A store's estimates of one type, in item and date order
    pub fn find_many_by_store_and_type(
        &self,
        store_id: &str,
        r#type: &ConsumptionEstimateType,
    ) -> Result<Vec<ConsumptionEstimateRow>, RepositoryError> {
        Ok(consumption_estimate::table
            .filter(consumption_estimate::store_id.eq(store_id))
            .filter(consumption_estimate::type_.eq(r#type))
            .order((
                consumption_estimate::item_id.asc(),
                consumption_estimate::date.asc(),
            ))
            .load(self.connection.lock().connection())?)
    }
}

#[derive(Debug, Clone)]
pub struct ConsumptionEstimateRowDelete(pub String);
impl Delete for ConsumptionEstimateRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                ConsumptionEstimateRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        diesel::delete(
            consumption_estimate_with_links::table
                .filter(consumption_estimate_with_links::id.eq(&self.0)),
        )
        .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ConsumptionEstimateRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for ConsumptionEstimateRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        ConsumptionEstimateRowRepository::new(con)._upsert(self)?;
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::generate_changelog(
                RowOrId::Row(self),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ConsumptionEstimateRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
