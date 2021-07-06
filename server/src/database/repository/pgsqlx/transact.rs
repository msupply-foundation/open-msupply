use crate::database::repository::{
    CustomerInvoiceRepository, PgSqlxRepository, Repository, RepositoryError, TransactRepository,
};
use crate::database::schema::{TransactRow, TransactRowType};

use async_trait::async_trait;

#[derive(Clone)]
pub struct TransactPgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for TransactPgSqlxRepository {}
impl PgSqlxRepository for TransactPgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> TransactPgSqlxRepository {
        TransactPgSqlxRepository { pool }
    }
}

#[async_trait]
impl TransactRepository for TransactPgSqlxRepository {
    async fn insert_one(&self, transact: &TransactRow) -> Result<(), RepositoryError> {
        sqlx::query!(
            r#"
            INSERT INTO transact (id, name_id, store_id, invoice_number, type_of)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            transact.id,
            transact.name_id,
            transact.store_id,
            transact.invoice_number,
            transact.type_of.clone() as TransactRowType
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn find_one_by_id(&self, id: &str) -> Result<TransactRow, RepositoryError> {
        let transact: TransactRow = sqlx::query_as!(
            TransactRow,
            r#"
            SELECT id, name_id, store_id, invoice_number, type_of AS "type_of!: TransactRowType"
            FROM transact
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(transact)
    }
}

#[derive(Clone)]
pub struct CustomerInvoicePgSqlxRepository {
    pool: sqlx::PgPool,
}

impl Repository for CustomerInvoicePgSqlxRepository {}
impl PgSqlxRepository for CustomerInvoicePgSqlxRepository {
    fn new(pool: sqlx::PgPool) -> CustomerInvoicePgSqlxRepository {
        CustomerInvoicePgSqlxRepository { pool }
    }
}

#[async_trait]
impl CustomerInvoiceRepository for CustomerInvoicePgSqlxRepository {
    async fn find_many_by_name_id(
        &self,
        name_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        let customer_invoices: Vec<TransactRow> = sqlx::query_as!(
            TransactRow,
            r#"
            SELECT id, name_id, store_id, invoice_number, type_of AS "type_of!: TransactRowType"
            FROM transact
            WHERE type_of = 'customer_invoice' AND name_id = $1
            "#,
            // TODO: pass type_of as param.
            name_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(customer_invoices)
    }

    async fn find_many_by_store_id(
        &self,
        store_id: &str,
    ) -> Result<Vec<TransactRow>, RepositoryError> {
        let customer_invoices: Vec<TransactRow> = sqlx::query_as!(
            TransactRow,
            r#"
            SELECT id, name_id, store_id, invoice_number, type_of AS "type_of!: TransactRowType"
            FROM transact
            WHERE type_of = 'customer_invoice' AND store_id = $1
            "#,
            // TODO: pass type_of as param.
            store_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(customer_invoices)
    }
}
