//! src/database/database.rs

use crate::database::mock::{generate_requisition_data, generate_requisition_line_data};
use crate::database::tables::{RequisitionLineRow, RequisitionRow};

use sqlx::PgPool;

#[derive(Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(pool: PgPool) -> Database {
        Database { pool }
    }

    pub async fn new_with_data(pool: PgPool) -> Database {
        let database = Database { pool };

        database
            .insert_requisitions(generate_requisition_data())
            .await
            .expect("Failed to insert mock requisition data");

        database
            .insert_requisition_lines(generate_requisition_line_data())
            .await
            .expect("Failed to insert mock requisition line data");

        database
    }

    pub async fn select_requisition(&self, id: String) -> Result<RequisitionRow, sqlx::Error> {
        let requisition_row = sqlx::query_as!(
            RequisitionRow,
            r#"
            SELECT id, from_id, to_id
            FROM requisition
            WHERE id = $1
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(requisition_row)
    }

    pub async fn select_requisition_lines(
        &self,
        requisition_id: String,
    ) -> Result<Vec<RequisitionLineRow>, sqlx::Error> {
        let requisition_lines = sqlx::query_as!(
            RequisitionLineRow,
            r#"
            SELECT id, requisition_id, item_name, item_quantity
            FROM requisition_line 
            WHERE requisition_id = $1
            "#,
            requisition_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(requisition_lines)
    }

    pub async fn insert_requisition(
        &self,
        requisition: &RequisitionRow,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO requisition (id, from_id, to_id)
            VALUES ($1, $2, $3)
            "#,
            requisition.id,
            requisition.from_id,
            requisition.to_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert_requisitions(
        &self,
        requisitions: Vec<RequisitionRow>,
    ) -> Result<(), sqlx::Error> {
        for requisition in requisitions {
            &self
                .insert_requisition(&requisition)
                .await
                .expect("Failed to insert requisition into database");
        }

        Ok(())
    }

    pub async fn insert_requisition_line(
        &self,
        requisition_line: &RequisitionLineRow,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO requisition_line (id, requisition_id, item_name, item_quantity)
            VALUES ($1, $2, $3, $4)
            "#,
            requisition_line.id,
            requisition_line.requisition_id,
            requisition_line.item_name,
            requisition_line.item_quantity,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn insert_requisition_lines(
        &self,
        requisition_lines: Vec<RequisitionLineRow>,
    ) -> Result<(), sqlx::Error> {
        for requisition_line in requisition_lines {
            &self
                .insert_requisition_line(&requisition_line)
                .await
                .expect("Failed to insert requisition line into database");
        }

        Ok(())
    }
}
