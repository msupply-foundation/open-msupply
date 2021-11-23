use super::StorageConnection;

use crate::{repository_error::RepositoryError, schema::InvoiceLineRow};

use diesel::prelude::*;

pub struct InvoiceLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceLineRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &InvoiceLineRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl::*;

        diesel::insert_into(invoice_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &InvoiceLineRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl::*;
        diesel::replace_into(invoice_line)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn delete(&self, invoice_line_id: &str) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl::*;
        diesel::delete(invoice_line.filter(id.eq(invoice_line_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<InvoiceLineRow, RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl::*;
        let result = invoice_line
            .filter(id.eq(row_id))
            .first(&self.connection.connection);
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl::*;
        let result = invoice_line
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_invoice_and_batch_id(
        &self,
        stock_line_id: &str,
        invoice_id: &str,
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl;
        Ok(dsl::invoice_line
            .filter(dsl::invoice_id.eq(invoice_id))
            .filter(dsl::stock_line_id.eq(stock_line_id))
            .load(&self.connection.connection)?)
    }

    pub fn find_many_by_invoice_id(
        &self,
        invoice_id_param: &str,
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        use crate::schema::diesel_schema::invoice_line::dsl::*;
        let result = invoice_line
            .filter(invoice_id.eq(invoice_id_param))
            .get_results(&self.connection.connection)?;
        Ok(result)
    }
}
