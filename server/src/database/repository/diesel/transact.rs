use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::{TransactRow, TransactRowType},
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

#[derive(Clone)]
pub struct TransactRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl TransactRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> TransactRepository {
        TransactRepository { pool }
    }

    pub async fn insert_one(&self, transact_row: &TransactRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::transact::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(transact)
            .values(transact_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, transact_id: &str) -> Result<TransactRow, RepositoryError> {
        use crate::database::schema::diesel_schema::transact::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = transact.filter(id.eq(transact_id)).first(&connection);
        result.map_err(|err| RepositoryError::from(err))
    }
}

#[derive(Clone)]
pub struct CustomerInvoiceRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl CustomerInvoiceRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> CustomerInvoiceRepository {
        CustomerInvoiceRepository { pool }
    }

    pub async fn find_many_by_name_id(
        &self,
        name: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::transact::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = transact
            .filter(
                type_of
                    .eq(TransactRowType::CustomerInvoice)
                    .and(name_id.eq(name)),
            )
            .get_results(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_store_id(
        &self,
        store: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::transact::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = transact
            .filter(
                type_of
                    .eq(TransactRowType::CustomerInvoice)
                    .and(store_id.eq(store)),
            )
            .get_results(&connection)?;
        Ok(result)
    }
}
