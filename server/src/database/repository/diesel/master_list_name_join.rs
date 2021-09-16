use super::{DBBackendConnection, DBConnection};

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::MasterListNameJoinRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct MasterListNameJoinRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl MasterListNameJoinRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        MasterListNameJoinRepository { pool }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one_tx(
        connection: &DBConnection,
        row: &MasterListNameJoinRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::master_list_name_join::dsl::*;

        diesel::insert_into(master_list_name_join)
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
        row: &MasterListNameJoinRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::master_list_name_join::dsl::*;
        diesel::replace_into(master_list_name_join)
            .values(row)
            .execute(connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, id: &str) -> Result<MasterListNameJoinRow, RepositoryError> {
        use crate::database::schema::diesel_schema::master_list_name_join::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = master_list_name_join.filter(id.eq(id)).first(&connection)?;
        Ok(result)
    }
}
