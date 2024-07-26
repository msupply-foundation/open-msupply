use super::{
    name_link_row::{name_link, name_link::dsl as name_link_dsl},
    name_row::{name, name::dsl as name_dsl},
    name_store_join::name_store_join::dsl as name_store_join_dsl,
    store_row::store,
    StorageConnection,
};
use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    NameLinkRow, NameRow,
};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};
use crate::{Delete, Upsert};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

table! {
    name_store_join (id) {
        id -> Text,
        name_link_id -> Text,
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
    }
}

#[derive(Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Clone, Default)]
#[diesel(table_name = name_store_join)]
pub struct NameStoreJoinRow {
    pub id: String,
    pub name_link_id: String,
    pub store_id: String,
    pub name_is_customer: bool,
    pub name_is_supplier: bool,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct NameStoreJoin {
    pub name_store_join: NameStoreJoinRow,
    pub name: NameRow,
}

joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(name_store_join, name_link);

type NameStoreJoins = (NameStoreJoinRow, (NameLinkRow, NameRow));

#[derive(Clone, Default)]
pub struct NameStoreJoinFilter {
    pub id: Option<EqualFilter<String>>,
    pub name_id: Option<EqualFilter<String>>,
}

pub struct NameStoreJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameStoreJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameStoreJoinRepository { connection }
    }

    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(name_store_join_dsl::name_store_join)
            .values(row)
            .on_conflict(name_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &NameStoreJoinRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::NameStoreJoin,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: Some(row.name_link_id.clone()),
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameStoreJoinRow>, RepositoryError> {
        let result = name_store_join_dsl::name_store_join
            .filter(name_store_join_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };
        diesel::delete(name_store_join_dsl::name_store_join.filter(name_store_join_dsl::id.eq(id)))
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

type BoxedNameStoreJoinQuery = IntoBoxed<
    'static,
    InnerJoin<name_store_join::table, InnerJoin<name_link::table, name::table>>,
    DBType,
>;

fn create_filtered_query(filter: Option<NameStoreJoinFilter>) -> BoxedNameStoreJoinQuery {
    let mut query = name_store_join_dsl::name_store_join
        .inner_join(name_link_dsl::name_link.inner_join(name_dsl::name))
        .into_boxed();

    if let Some(f) = filter {
        let NameStoreJoinFilter { id, name_id } = f;

        apply_equal_filter!(query, id, name_store_join_dsl::id);
        apply_equal_filter!(query, name_id, name_dsl::id);
    }

    query
}

fn to_domain((name_store_join_row, (_, name_row)): NameStoreJoins) -> NameStoreJoin {
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
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = NameStoreJoinRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NameStoreJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
