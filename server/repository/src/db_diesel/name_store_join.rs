use super::{name_row::name, store_row::store, StorageConnection};
use crate::diesel_macros::define_linked_tables;
use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    NameRow,
};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, KeyValueStoreRepository, RowActionType};
use crate::{Delete, ChangelogSyncType, Upsert};

use diesel::{dsl::IntoBoxed, prelude::*};

define_linked_tables!(
    view: name_store_join = "name_store_join_view",
    core: name_store_join_with_links = "name_store_join",
    struct: NameStoreJoinRow,
    repo: NameStoreJoinRepository,
    shared: {
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
    },
    links: {
        name_link_id -> name_id,
    },
    optional_links: {
    }
);

#[derive(Queryable, Debug, PartialEq, Eq, Clone, Default)]
#[diesel(table_name = name_store_join)]
pub struct NameStoreJoinRow {
    pub id: String,
    pub store_id: String,
    pub name_is_customer: bool,
    pub name_is_supplier: bool,
    pub name_id: String,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct NameStoreJoin {
    pub name_store_join: NameStoreJoinRow,
    pub name: NameRow,
}

joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name (name_id));

type NameStoreJoins = (NameStoreJoinRow, NameRow);

#[derive(Clone, Default)]
pub struct NameStoreJoinFilter {
    pub id: Option<EqualFilter<String>>,
    pub name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
}

impl NameStoreJoinRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::NameStoreJoin,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            name_id: Some(self.name_id.clone()),
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }
}

pub struct NameStoreJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameStoreJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameStoreJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        let changelog = row.changelog(self.connection, RowActionType::Upsert, None)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn upsert_one_without_changelog(
        &self,
        row: &NameStoreJoinRow,
    ) -> Result<(), RepositoryError> {
        self._upsert(row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameStoreJoinRow>, RepositoryError> {
        let result = name_store_join::table
            .filter(name_store_join::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(old_row) => {
                let changelog = old_row.changelog(self.connection, RowActionType::Delete, None)?;
                ChangelogRepository::new(self.connection).insert(&changelog)?
            }
            None => {
                return Ok(None);
            }
        };
        diesel::delete(
            name_store_join_with_links::table.filter(name_store_join_with_links::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn query_by_filter(
        &self,
        filter: NameStoreJoinFilter,
    ) -> Result<Vec<NameStoreJoin>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<NameStoreJoinFilter>,
    ) -> Result<Vec<NameStoreJoin>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<NameStoreJoins>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    name_store_join::table.inner_join(name::table)
}

type BoxedQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(filter: Option<NameStoreJoinFilter>) -> BoxedQuery {
    let mut query = query().into_boxed();

    if let Some(f) = filter {
        let NameStoreJoinFilter {
            id,
            name_id,
            store_id,
        } = f;

        apply_equal_filter!(query, id, name_store_join::id);
        apply_equal_filter!(query, name_id, name_store_join::name_id);
        apply_equal_filter!(query, store_id, name_store_join::store_id);
    }

    query
}

fn to_domain((name_store_join_row, name_row): NameStoreJoins) -> NameStoreJoin {
    NameStoreJoin {
        name_store_join: name_store_join_row,
        name: name_row,
    }
}

impl NameStoreJoinFilter {
    pub fn new() -> NameStoreJoinFilter {
        NameStoreJoinFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
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
}

#[derive(Debug, Clone)]
pub struct NameStoreJoinRowDelete(pub String);
impl Delete for NameStoreJoinRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        NameStoreJoinRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            NameStoreJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for NameStoreJoinRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        NameStoreJoinRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameStoreJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
