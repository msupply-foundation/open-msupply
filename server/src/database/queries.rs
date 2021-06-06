//! src/database/queries.rs

use crate::database::schema::{ItemRow, RequisitionLineRow, RequisitionRow};

pub async fn insert_item(pool: &sqlx::PgPool, item: &ItemRow) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO item (id, item_name)
        VALUES ($1, $2)
        "#,
        item.id,
        item.item_name
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_items(pool: &sqlx::PgPool, items: Vec<ItemRow>) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for item in &items {
        sqlx::query!(
            r#"
            INSERT INTO item (id, item_name)
            VALUES ($1, $2)
            "#,
            item.id,
            item.item_name
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn insert_requisition(
    pool: &sqlx::PgPool,
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
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_requisitions(
    pool: &sqlx::PgPool,
    requisitions: Vec<RequisitionRow>,
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for requisition in &requisitions {
        sqlx::query!(
            r#"
            INSERT INTO requisition (id, from_id, to_id)
            VALUES ($1, $2, $3)
            "#,
            requisition.id,
            requisition.from_id,
            requisition.to_id
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn insert_requisition_line(
    pool: &sqlx::PgPool,
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
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_requisition_lines(
    pool: &sqlx::PgPool,
    requisition_lines: Vec<RequisitionLineRow>,
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for requisition_line in &requisition_lines {
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
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn select_item(pool: &sqlx::PgPool, id: String) -> Result<ItemRow, sqlx::Error> {
    let item = sqlx::query_as!(
        ItemRow,
        r#"
            SELECT id, item_name
            FROM item
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(item)
}

pub async fn select_requisition(
    pool: &sqlx::PgPool,
    id: String,
) -> Result<RequisitionRow, sqlx::Error> {
    let requisition = sqlx::query_as!(
        RequisitionRow,
        r#"
            SELECT id, from_id, to_id
            FROM requisition
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(requisition)
}

pub async fn select_requisition_line(
    pool: &sqlx::PgPool,
    id: String,
) -> Result<RequisitionLineRow, sqlx::Error> {
    let requisition_line = sqlx::query_as!(
        RequisitionLineRow,
        r#"
        SELECT id, requisition_id, item_name, item_quantity
        FROM requisition_line 
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(requisition_line)
}

pub async fn select_requisition_lines(
    pool: &sqlx::PgPool,
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
    .fetch_all(pool)
    .await?;

    Ok(requisition_lines)
}
