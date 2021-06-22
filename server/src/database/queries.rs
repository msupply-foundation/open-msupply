use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow, RequisitionRowType,
    StoreRow, TransactLineRow, TransactRow, TransactRowType, UserAccountRow,
};

pub async fn insert_user_acount(
    pool: &sqlx::PgPool,
    user_account: &UserAccountRow,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO user_account (id, username, password, email)
        VALUES ($1, $2, $3, $4)
        "#,
        user_account.id,
        user_account.username,
        user_account.password,
        user_account.email,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_store(pool: &sqlx::PgPool, store: &StoreRow) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO store (id, name_id)
        VALUES ($1, $2)
        "#,
        store.id,
        store.name_id
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_stores(pool: &sqlx::PgPool, stores: &[StoreRow]) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for store in stores {
        sqlx::query!(
            r#"
                INSERT INTO store (id, name_id)
                VALUES ($1, $2)
                "#,
            store.id,
            store.name_id
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn insert_name(pool: &sqlx::PgPool, name: &NameRow) -> Result<(), sqlx::Error> {
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

pub async fn insert_names(pool: &sqlx::PgPool, names: &[NameRow]) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for name in names {
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

pub async fn insert_items(pool: &sqlx::PgPool, items: &[ItemRow]) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for item in items {
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
    item_lines: &[ItemLineRow],
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for item_line in item_lines {
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
        INSERT INTO requisition (id, name_id, store_id, type_of)
        VALUES ($1, $2, $3, $4)
        "#,
        requisition.id,
        requisition.name_id,
        requisition.store_id,
        requisition.type_of.clone() as RequisitionRowType
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_requisitions(
    pool: &sqlx::PgPool,
    requisitions: &[RequisitionRow],
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for requisition in requisitions {
        sqlx::query!(
            r#"
            INSERT INTO requisition (id, name_id, store_id, type_of)
            VALUES ($1, $2, $3, $4)
            "#,
            requisition.id,
            requisition.name_id,
            requisition.store_id,
            requisition.type_of.clone() as RequisitionRowType
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
    requisition_lines: &[RequisitionLineRow],
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for requisition_line in requisition_lines {
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

pub async fn select_user_account(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<UserAccountRow, sqlx::Error> {
    let user_account = sqlx::query_as!(
        UserAccountRow,
        r#"
            SELECT id, username, password, email
            FROM user_account
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(user_account)
}

pub async fn select_store(pool: &sqlx::PgPool, id: &str) -> Result<StoreRow, sqlx::Error> {
    let store = sqlx::query_as!(
        StoreRow,
        r#"
            SELECT id, name_id
            FROM store
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(store)
}

pub async fn select_name(pool: &sqlx::PgPool, id: &str) -> Result<NameRow, sqlx::Error> {
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

pub async fn select_item(pool: &sqlx::PgPool, id: &str) -> Result<ItemRow, sqlx::Error> {
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

pub async fn select_item_line(pool: &sqlx::PgPool, id: &str) -> Result<ItemLineRow, sqlx::Error> {
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
    id: &str,
) -> Result<RequisitionRow, sqlx::Error> {
    let requisition = sqlx::query_as!(
        RequisitionRow,
        r#"
            SELECT id, name_id, store_id, type_of AS "type_of!: RequisitionRowType"
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
    id: &str,
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
    requisition_id: &str,
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

pub async fn select_transact(pool: &sqlx::PgPool, id: &str) -> Result<TransactRow, sqlx::Error> {
    let transact: TransactRow = sqlx::query_as!(
        TransactRow,
        r#"
        SELECT id, name_id, invoice_number, type_of AS "type_of!: TransactRowType"
        FROM transact
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(transact)
}

pub async fn select_transacts(
    pool: &sqlx::PgPool,
    name_id: &str,
) -> Result<Vec<TransactRow>, sqlx::Error> {
    let transacts: Vec<TransactRow> = sqlx::query_as!(
        TransactRow,
        r#"
        SELECT id, name_id, invoice_number, type_of AS "type_of!: TransactRowType"
        FROM transact
        WHERE name_id = $1
        "#,
        name_id
    )
    .fetch_all(pool)
    .await?;

    Ok(transacts)
}

pub async fn select_transact_line(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<TransactLineRow, sqlx::Error> {
    let transact_line: TransactLineRow = sqlx::query_as!(
        TransactLineRow,
        r#"
        SELECT id, transact_id, item_id, item_line_id
        FROM transact_line
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(transact_line)
}

pub async fn select_transact_lines(
    pool: &sqlx::PgPool,
    transact_id: &str,
) -> Result<Vec<TransactLineRow>, sqlx::Error> {
    let transact_lines: Vec<TransactLineRow> = sqlx::query_as!(
        TransactLineRow,
        r#"
        SELECT id, transact_id, item_id, item_line_id
        FROM transact_line
        WHERE transact_id = $1
        "#,
        transact_id
    )
    .fetch_all(pool)
    .await?;

    Ok(transact_lines)
}
