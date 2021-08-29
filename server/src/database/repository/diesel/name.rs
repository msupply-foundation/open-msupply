use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::NameRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

#[derive(Clone)]
pub struct NameRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl NameRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> NameRepository {
        NameRepository { pool }
    }

    pub async fn insert_one(&self, name_row: &NameRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::name_table::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(name_table)
            .values(name_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, name_id: &str) -> Result<NameRow, RepositoryError> {
        use crate::database::schema::diesel_schema::name_table::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = name_table.filter(id.eq(name_id)).first(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
