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

table! {
    #[sql_name = "name_store_join"]
    name_store_join_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

#[derive(Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Clone, Default)]
#[table_name = "name_store_join"]
pub struct NameStoreJoinRow {
    pub id: String,
    #[column_name = "name_link_id"]
    pub name_id: String,
    pub store_id: String,
    pub name_is_customer: bool,
    pub name_is_supplier: bool,
}

joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(name_store_join, name_link);

type NameStoreJoin = (NameStoreJoinRow, (NameLinkRow, NameRow));

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
    fn _upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_store_join_dsl::name_store_join)
            .values(row)
            .on_conflict(name_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_store_join_dsl::name_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(name_store_join_is_sync_update::table.find(id))
            .set(name_store_join_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
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

        let result = query.load::<NameStoreJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn sync_upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = name_store_join_is_sync_update::table
            .find(id)
            .select(name_store_join_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

type BoxedNameStoreJoinQuery = IntoBoxed<
    'static,
    InnerJoin<name_store_join::table, InnerJoin<name_link::table, name::table>>,
    DBType,
>;

fn create_filtered_query<'a>(filter: Option<NameStoreJoinFilter>) -> BoxedNameStoreJoinQuery {
    let mut query = name_store_join_dsl::name_store_join
        .inner_join(name_link_dsl::name_link.inner_join(name_dsl::name))
        .into_boxed();

    if let Some(f) = filter {
        let NameStoreJoinFilter { name_id } = f;

        apply_equal_filter!(query, name_id, name_dsl::id);
    }

    query
}

fn to_domain((name_store_join_row, (_, name_row)): NameStoreJoin) -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: name_store_join_row.id,
        name_id: name_row.id,
        store_id: name_store_join_row.store_id,
        name_is_customer: name_store_join_row.name_is_customer,
        name_is_supplier: name_store_join_row.name_is_supplier,
    }
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

#[cfg(test)]
mod test {
    use util::uuid::uuid;

    use crate::{
        mock::{mock_name_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
        NameStoreJoinRepository, NameStoreJoinRow,
    };

    #[actix_rt::test]
    async fn name_store_join_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "name_store_join_is_sync_update",
            MockDataInserts::none().items().units().names().stores(),
        )
        .await;

        let repo = NameStoreJoinRepository::new(&connection);

        let base_row = NameStoreJoinRow {
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            ..Default::default()
        };
        // Two rows, to make sure is_sync_update update only affects one row
        let row = NameStoreJoinRow {
            id: uuid(),
            ..base_row.clone()
        };
        let row2 = NameStoreJoinRow {
            id: uuid(),
            ..base_row.clone()
        };

        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
