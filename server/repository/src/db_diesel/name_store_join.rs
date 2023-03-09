use super::{
    name_row::name, name_store_join::name_store_join::dsl as name_store_join_dsl, store_row::store,
    StorageConnection,
};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
};

use diesel::{dsl::IntoBoxed, prelude::*};

table! {
    name_store_join (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
        is_active -> Bool,
    }
}

#[derive(Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Clone, Default)]
#[table_name = "name_store_join"]
pub struct NameStoreJoinRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub name_is_customer: bool,
    pub name_is_supplier: bool,
    pub is_active: bool,
}

joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name (name_id));

#[derive(Clone, Default)]
pub struct NameStoreJoinFilter {
    pub name_id: Option<EqualFilter<String>>,
}

pub struct NameStoreJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameStoreJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameStoreJoinRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_store_join_dsl::name_store_join)
            .values(row)
            .on_conflict(name_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_store_join_dsl::name_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameStoreJoinRow>, RepositoryError> {
        let result = name_store_join_dsl::name_store_join
            .filter(name_store_join_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_store_join_dsl::name_store_join.filter(name_store_join_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn query_by_filter(
        &self,
        filter: NameStoreJoinFilter,
    ) -> Result<Vec<NameStoreJoinRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<NameStoreJoinFilter>,
    ) -> Result<Vec<NameStoreJoinRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<NameStoreJoinRow>(&self.connection.connection)?;

        Ok(result)
    }
}

type BoxedNameStoreJoinQuery = IntoBoxed<'static, name_store_join::table, DBType>;

fn create_filtered_query<'a>(filter: Option<NameStoreJoinFilter>) -> BoxedNameStoreJoinQuery {
    let mut query = name_store_join_dsl::name_store_join.into_boxed();

    if let Some(f) = filter {
        let NameStoreJoinFilter { name_id } = f;

        apply_equal_filter!(query, name_id, name_store_join_dsl::name_id);
    }

    query
}

impl NameStoreJoinFilter {
    pub fn new() -> NameStoreJoinFilter {
        NameStoreJoinFilter::default()
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }
}
