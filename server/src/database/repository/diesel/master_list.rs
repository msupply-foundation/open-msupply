use super::{DBBackendConnection, DBConnection};

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::MasterListRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

#[derive(Clone)]
pub struct MasterListRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl MasterListRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        MasterListRepository { pool }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one_tx(
        connection: &DBConnection,
        row: &MasterListRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::master_list::dsl::*;

        diesel::insert_into(master_list)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one_tx(
        connection: &DBConnection,
        row: &MasterListRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::master_list::dsl::*;
        diesel::replace_into(master_list)
            .values(row)
            .execute(connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<MasterListRow, RepositoryError> {
        use crate::database::schema::diesel_schema::master_list::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = master_list.filter(id.eq(id)).first(&connection)?;
        Ok(result)
    }
}
