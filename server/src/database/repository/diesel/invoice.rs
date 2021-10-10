use super::StorageConnection;

use crate::database::{
    repository::RepositoryError,
    schema::{InvoiceRow, InvoiceRowType},
};

use diesel::prelude::*;

pub struct InvoiceRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceRepository { connection }
    }

    pub fn insert_one(&self, invoice_row: &InvoiceRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        diesel::insert_into(invoice)
            .values(invoice_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, invoice_id: &str) -> Result<InvoiceRow, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let result = invoice
            .filter(id.eq(invoice_id))
            .first(&self.connection.connection);
        result.map_err(|err| RepositoryError::from(err))
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let result = invoice
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}

pub struct CustomerInvoiceRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CustomerInvoiceRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CustomerInvoiceRepository { connection }
    }

    pub async fn find_many_by_name_id(
        &self,
        name: &str,
    ) -> Result<Vec<InvoiceRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let result = invoice
            .filter(
                type_
                    .eq(InvoiceRowType::CustomerInvoice)
                    .and(name_id.eq(name)),
            )
            .get_results(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_store_id(&self, store: &str) -> Result<Vec<InvoiceRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let result = invoice
            .filter(
                type_
                    .eq(InvoiceRowType::CustomerInvoice)
                    .and(store_id.eq(store)),
            )
            .get_results(&self.connection.connection)?;
        Ok(result)
    }
}
