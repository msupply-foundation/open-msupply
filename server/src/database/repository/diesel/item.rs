use super::{DBBackendConnection, DBConnection};

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::ItemRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

#[derive(Clone)]
pub struct ItemRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl ItemRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> ItemRepository {
        ItemRepository { pool }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one_tx(
        connection: &DBConnection,
        item_row: &ItemRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;

        diesel::insert_into(item)
            .values(item_row)
            .on_conflict(id)
            .do_update()
            .set(item_row)
            .execute(connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one_tx(
        connection: &DBConnection,
        item_row: &ItemRow,
    ) -> Result<(), RepositoryError> {
        use diesel::sql_types::Text;

        let query = r#"
        INSERT INTO item(id,item_name,type_of) VALUES($1, $2, $3)
        ON CONFLICT(id) DO UPDATE SET
            item_name=excluded.item_name,
            type_of=excluded.type_of;"#;
        let q = diesel::sql_query(query)
            .bind::<Text, _>(&item_row.id)
            .bind::<Text, _>(&item_row.item_name)
            .bind::<crate::database::schema::item::ItemRowTypeMapping, _>(&item_row.type_of);
        q.execute(connection)?;
        Ok(())
    }

    pub fn insert_one_tx(
        connection: &DBConnection,
        item_row: &ItemRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        diesel::insert_into(item)
            .values(item_row)
            .execute(connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        let connection = get_connection(&self.pool)?;
        ItemRepository::insert_one_tx(&connection, item_row)?;
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<ItemRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = item.load(&connection);
        Ok(result?)
    }

    pub async fn find_one_by_id(&self, item_id: &str) -> Result<ItemRow, RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = item.filter(id.eq(item_id)).first(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ItemRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::item::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = item.filter(id.eq_any(ids)).load(&connection)?;
        Ok(result)
    }
}
