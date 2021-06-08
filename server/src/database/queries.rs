//! src/database/queries.rs

use crate::database::schema::{NameRow, ItemLineRow, ItemRow, RequisitionLineRow, RequisitionRow};

pub async fn insert_name(pool: &sqlx::PgPool,  name: &NameRow) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO name (id, name)
        VALUES ($1, $2)
        "#,
        name.id,
        name.name
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_names(pool: &sqlx::PgPool, names: Vec<NameRow>) -> Result<(), sqlx::Error> {
        // TODO: aggregate into single query.
        for name in &names {
            sqlx::query!(
                r#"
                INSERT INTO name (id, name)
                VALUES ($1, $2)
                "#,
                name.id,
                name.name
            )
            .execute(pool)
            .await?;
        }
    
        Ok(())
}

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

pub async fn insert_item_line(
    pool: &sqlx::PgPool,
    item_line: &ItemLineRow,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO item_line (id, item_id, store_id, batch, quantity)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        item_line.id,
        item_line.item_id,
        item_line.store_id,
        item_line.batch,
        item_line.quantity
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_item_lines(
    pool: &sqlx::PgPool,
    item_lines: Vec<ItemLineRow>,
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for item_line in &item_lines {
        sqlx::query!(
            r#"
            INSERT INTO item_line (id, item_id, store_id, batch, quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            item_line.id,
            item_line.item_id,
            item_line.store_id,
            item_line.batch,
            item_line.quantity,
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
        INSERT INTO requisition (id, name_id, store_id)
        VALUES ($1, $2, $3)
        "#,
        requisition.id,
        requisition.name_id,
        requisition.store_id
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
            INSERT INTO requisition (id, name_id, store_id)
            VALUES ($1, $2, $3)
            "#,
            requisition.id,
            requisition.name_id,
            requisition.store_id
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
        INSERT INTO requisition_line (id, requisition_id, item_id, actual_quantity, suggested_quantity)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        requisition_line.id,
        requisition_line.requisition_id,
        requisition_line.item_id,
        requisition_line.actual_quantity,
        requisition_line.suggested_quantity
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
            INSERT INTO requisition_line (id, requisition_id, item_id, actual_quantity, suggested_quantity)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            requisition_line.id,
            requisition_line.requisition_id,
            requisition_line.item_id,
            requisition_line.actual_quantity,
            requisition_line.suggested_quantity
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn select_name(pool: &sqlx::PgPool, id: String) -> Result<NameRow, sqlx::Error> {
    let name = sqlx::query_as!(
        NameRow,
        r#"
            SELECT id, name
            FROM name
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(name)
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

pub async fn select_item_line(pool: &sqlx::PgPool, id: String) -> Result<ItemLineRow, sqlx::Error> {
    let item_line = sqlx::query_as!(
        ItemLineRow,
        r#"
            SELECT id, item_id, store_id, batch, quantity
            from item_line
            where id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(item_line)
}

pub async fn select_requisition(
    pool: &sqlx::PgPool,
    id: String,
) -> Result<RequisitionRow, sqlx::Error> {
    let requisition = sqlx::query_as!(
        RequisitionRow,
        r#"
            SELECT id, name_id, store_id
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
        SELECT id, requisition_id, item_id, actual_quantity, suggested_quantity
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
        SELECT id, requisition_id, item_id, actual_quantity, suggested_quantity
        FROM requisition_line 
        WHERE requisition_id = $1
        "#,
        requisition_id
    )
    .fetch_all(pool)
    .await?;

    Ok(requisition_lines)
}
