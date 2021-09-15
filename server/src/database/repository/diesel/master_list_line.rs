use super::{DBBackendConnection, DBConnection};

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::MasterListLineRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct MasterListLineRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl MasterListLineRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        MasterListLineRepository { pool }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one_tx(
        connection: &DBConnection,
        row: &MasterListLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::master_list_line::dsl::*;

        diesel::insert_into(master_list_line)
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
        row: &MasterListLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::master_list_line::dsl::*;
        diesel::replace_into(master_list_line)
            .values(row)
            .execute(connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<MasterListLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::master_list_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = master_list_line.filter(id.eq(id)).first(&connection)?;
        Ok(result)
    }
}
