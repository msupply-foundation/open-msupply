//! src/utils/database/connection.rs

use crate::database::queries;
use crate::database::schema::{RequisitionLineRow, RequisitionRow};

#[derive(Clone)]
pub struct DatabaseConnection {
    pool: sqlx::PgPool,
}

impl DatabaseConnection {
    pub async fn new(pool: sqlx::PgPool) -> DatabaseConnection {
        DatabaseConnection { pool }
    }

    pub async fn create_requisition(
        &self,
        requisition: &RequisitionRow,
    ) -> Result<(), sqlx::Error> {
        queries::insert_requisition(&self.pool, requisition).await
    }

    pub async fn create_requisitions(
        &self,
        requisitions: Vec<RequisitionRow>,
    ) -> Result<(), sqlx::Error> {
        queries::insert_requisitions(&self.pool, requisitions).await
    }

    pub async fn create_requisition_line(
        &self,
        requisition_line: &RequisitionLineRow,
    ) -> Result<(), sqlx::Error> {
        queries::insert_requisition_line(&self.pool, requisition_line).await
    }

    pub async fn create_requisition_lines(
        &self,
        requisition_lines: Vec<RequisitionLineRow>,
    ) -> Result<(), sqlx::Error> {
        queries::insert_requisition_lines(&self.pool, requisition_lines).await
    }

    pub async fn get_requisition(&self, id: String) -> Result<RequisitionRow, sqlx::Error> {
        queries::select_requisition(&self.pool, id).await
    }

    #[allow(dead_code)]
    pub async fn get_requisition_line(
        &self,
        id: String,
    ) -> Result<RequisitionLineRow, sqlx::Error> {
        queries::select_requisition_line(&self.pool, id).await
    }

    pub async fn get_requisition_lines(
        &self,
        requisition_id: String,
    ) -> Result<Vec<RequisitionLineRow>, sqlx::Error> {
        queries::select_requisition_lines(&self.pool, requisition_id).await
    }
}
