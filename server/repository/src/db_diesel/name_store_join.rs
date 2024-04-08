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

table! {
    #[sql_name = "name_store_join"]
    name_store_join_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
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
    connection: &'a mut StorageConnection,
}

impl<'a> NameStoreJoinRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        NameStoreJoinRepository { connection }
    }

    #[cfg(feature = "postgres")]
    fn _upsert_one(&mut self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_store_join_dsl::name_store_join)
            .values(row)
            .on_conflict(name_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&mut self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_store_join_dsl::name_store_join)
            .values(row)
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(
        &mut self,
        id: &str,
        is_sync_update: bool,
    ) -> Result<(), RepositoryError> {
        diesel::update(name_store_join_is_sync_update::table.find(id))
            .set(name_store_join_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&mut self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&mut self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &mut self,
        id: &str,
    ) -> Result<Option<NameStoreJoinRow>, RepositoryError> {
        let result = name_store_join_dsl::name_store_join
            .filter(name_store_join_dsl::id.eq(id))
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&mut self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_store_join_dsl::name_store_join.filter(name_store_join_dsl::id.eq(id)))
            .execute(&mut self.connection.connection)?;
        Ok(())
    }

    pub fn query_by_filter(
        &mut self,
        filter: NameStoreJoinFilter,
    ) -> Result<Vec<NameStoreJoin>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &mut self,
        filter: Option<NameStoreJoinFilter>,
    ) -> Result<Vec<NameStoreJoin>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<NameStoreJoins>(&mut self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn sync_upsert_one(&mut self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&mut self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = name_store_join_is_sync_update::table
            .find(id)
            .select(name_store_join_is_sync_update::dsl::is_sync_update)
            .first(&mut self.connection.connection)
            .optional()?;
        Ok(result)
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
    fn delete(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        NameStoreJoinRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &mut StorageConnection) {
        assert_eq!(
            NameStoreJoinRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for NameStoreJoinRow {
    fn upsert_sync(&self, con: &mut StorageConnection) -> Result<(), RepositoryError> {
        NameStoreJoinRepository::new(con).sync_upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &mut StorageConnection) {
        assert_eq!(
            NameStoreJoinRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
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
        let (_, mut connection, _, _) = setup_all(
            "name_store_join_is_sync_update",
            MockDataInserts::none().items().units().names().stores(),
        )
        .await;

        let mut repo = NameStoreJoinRepository::new(&mut connection);

        let base_row = NameStoreJoinRow {
            name_link_id: mock_name_a().id,
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
