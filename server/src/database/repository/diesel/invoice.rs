use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::{InvoiceRow, InvoiceRowType},
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct InvoiceRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl InvoiceRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> InvoiceRepository {
        InvoiceRepository { pool }
    }

    pub async fn insert_one(&self, invoice_row: &InvoiceRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(invoice)
            .values(invoice_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, invoice_id: &str) -> Result<InvoiceRow, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice.filter(id.eq(invoice_id)).first(&connection);
        result.map_err(|err| RepositoryError::from(err))
    }

    pub async fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<InvoiceRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice.filter(id.eq_any(ids)).load(&connection)?;
        Ok(result)
    }
}

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
    ) -> Result<Vec<InvoiceRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice
            .filter(
                type_
                    .eq(InvoiceRowType::CustomerInvoice)
                    .and(name_id.eq(name)),
            )
            .get_results(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_store_id(
        &self,
        store: &str,
    ) -> Result<Vec<InvoiceRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = invoice
            .filter(
                type_
                    .eq(InvoiceRowType::CustomerInvoice)
                    .and(store_id.eq(store)),
            )
            .get_results(&connection)?;
        Ok(result)
    }
}
