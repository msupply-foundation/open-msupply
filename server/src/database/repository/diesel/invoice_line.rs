use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::InvoiceLineRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct InvoiceLineRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl InvoiceLineRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> InvoiceLineRepository {
        InvoiceLineRepository { pool }
    }

    pub async fn insert_one(
        &self,
        invoice_line_row: &InvoiceLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(invoice_line)
            .values(invoice_line_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, row_id: &str) -> Result<InvoiceLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice_line.filter(id.eq(row_id)).first(&connection);
        result.map_err(|err| RepositoryError::from(err))
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice_line.filter(id.eq_any(ids)).load(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_invoice_id(
        &self,
        invoice_id_param: &str,
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice_line
            .filter(invoice_id.eq(invoice_id_param))
            .get_results(&connection)?;
        Ok(result)
    }
}
