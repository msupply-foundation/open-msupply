use super::StorageConnection;

use crate::database::{repository::RepositoryError, schema::InvoiceLineRow};

use diesel::prelude::*;

pub struct InvoiceLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceLineRepository { connection }
    }

    pub async fn insert_one(
        &self,
        invoice_line_row: &InvoiceLineRow,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        diesel::insert_into(invoice_line)
            .values(invoice_line_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<InvoiceLineRow, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let result = invoice_line
            .filter(id.eq(row_id))
            .first(&self.connection.connection);
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let result = invoice_line
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_invoice_id(
        &self,
        invoice_id_param: &str,
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line::dsl::*;
        let result = invoice_line
            .filter(invoice_id.eq(invoice_id_param))
            .get_results(&self.connection.connection)?;
        Ok(result)
    }
}
