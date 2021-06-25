use crate::database;

pub async fn insert_user_acount(
    pool: &sqlx::PgPool,
    user_account: &database::schema::UserAccountRow,
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

pub async fn insert_store(
    pool: &sqlx::PgPool,
    store: &database::schema::StoreRow,
) -> Result<(), sqlx::Error> {
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

pub async fn insert_stores(
    pool: &sqlx::PgPool,
    stores: &[database::schema::StoreRow],
) -> Result<(), sqlx::Error> {
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

pub async fn insert_name(
    pool: &sqlx::PgPool,
    name: &database::schema::NameRow,
) -> Result<(), sqlx::Error> {
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

pub async fn insert_names(
    pool: &sqlx::PgPool,
    names: &[database::schema::NameRow],
) -> Result<(), sqlx::Error> {
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

pub async fn insert_item(
    pool: &sqlx::PgPool,
    item: &database::schema::ItemRow,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO item (id, item_name, type_of)
        VALUES ($1, $2, $3)
        "#,
        item.id,
        item.item_name,
        item.type_of.clone() as database::schema::ItemRowType,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_items(
    pool: &sqlx::PgPool,
    items: &[database::schema::ItemRow],
) -> Result<(), sqlx::Error> {
    // TODO: aggregate into single query.
    for item in items {
        sqlx::query!(
            r#"
            INSERT INTO item (id, item_name, type_of)
            VALUES ($1, $2, $3)
            "#,
            item.id,
            item.item_name,
            item.type_of.clone() as database::schema::ItemRowType,
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn insert_item_line(
    pool: &sqlx::PgPool,
    item_line: &database::schema::ItemLineRow,
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
    item_lines: &[database::schema::ItemLineRow],
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
    requisition: &database::schema::RequisitionRow,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO requisition (id, name_id, store_id, type_of)
        VALUES ($1, $2, $3, $4)
        "#,
        requisition.id,
        requisition.name_id,
        requisition.store_id,
        requisition.type_of.clone() as database::schema::RequisitionRowType
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_requisitions(
    pool: &sqlx::PgPool,
    requisitions: &[database::schema::RequisitionRow],
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
            requisition.type_of.clone() as database::schema::RequisitionRowType
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn insert_requisition_line(
    pool: &sqlx::PgPool,
    requisition_line: &database::schema::RequisitionLineRow,
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
    requisition_lines: &[database::schema::RequisitionLineRow],
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

pub async fn insert_transact(
    pool: &sqlx::PgPool,
    transact: &database::schema::TransactRow,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
            INSERT INTO transact (id, name_id, store_id, invoice_number, type_of)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        transact.id,
        transact.name_id,
        transact.store_id,
        transact.invoice_number,
        transact.type_of.clone() as database::schema::TransactRowType
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_transacts(
    pool: &sqlx::PgPool,
    transacts: &[database::schema::TransactRow],
) -> Result<(), sqlx::Error> {
    for transact in transacts {
        sqlx::query!(
            r#"
            INSERT INTO transact (id, name_id, store_id, invoice_number, type_of)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            transact.id,
            transact.name_id,
            transact.store_id,
            transact.invoice_number,
            transact.type_of.clone() as database::schema::TransactRowType
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn select_user_account_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::UserAccountRow, sqlx::Error> {
    let user_account = sqlx::query_as!(
        database::schema::UserAccountRow,
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

pub async fn select_store_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::StoreRow, sqlx::Error> {
    let store = sqlx::query_as!(
        database::schema::StoreRow,
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

pub async fn select_name_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::NameRow, sqlx::Error> {
    let name = sqlx::query_as!(
        database::schema::NameRow,
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

pub async fn select_item_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::ItemRow, sqlx::Error> {
    let item = sqlx::query_as!(
        database::schema::ItemRow,
        r#"
            SELECT id, item_name, type_of AS "type_of!: database::schema::ItemRowType"
            FROM item
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(item)
}

pub async fn select_item_line_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::ItemLineRow, sqlx::Error> {
    let item_line = sqlx::query_as!(
        database::schema::ItemLineRow,
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

pub async fn select_requisition_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::RequisitionRow, sqlx::Error> {
    let requisition = sqlx::query_as!(
        database::schema::RequisitionRow,
        r#"
            SELECT id, name_id, store_id, type_of AS "type_of!: database::schema::RequisitionRowType"
            FROM requisition
            WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(requisition)
}

pub async fn select_requisition_line_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::RequisitionLineRow, sqlx::Error> {
    let requisition_line = sqlx::query_as!(
        database::schema::RequisitionLineRow,
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

pub async fn select_requisition_lines_by_requisition_id(
    pool: &sqlx::PgPool,
    requisition_id: &str,
) -> Result<Vec<database::schema::RequisitionLineRow>, sqlx::Error> {
    let requisition_lines = sqlx::query_as!(
        database::schema::RequisitionLineRow,
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

pub async fn select_transact_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::TransactRow, sqlx::Error> {
    let transact: database::schema::TransactRow = sqlx::query_as!(
        database::schema::TransactRow,
        r#"
        SELECT id, name_id, store_id, invoice_number, type_of AS "type_of!: database::schema::TransactRowType"
        FROM transact
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(transact)
}

pub async fn select_customer_invoices_by_name_id(
    pool: &sqlx::PgPool,
    name_id: &str,
) -> Result<Vec<database::schema::TransactRow>, sqlx::Error> {
    let customer_invoices: Vec<database::schema::TransactRow> = sqlx::query_as!(
        database::schema::TransactRow,
        r#"
        SELECT id, name_id, store_id, invoice_number, type_of AS "type_of!: database::schema::TransactRowType"
        FROM transact
        WHERE type_of = 'customer_invoice' AND name_id = $1
        "#,
        name_id
    )
    .fetch_all(pool)
    .await?;

    Ok(customer_invoices)
}

pub async fn select_customer_invoices_by_store_id(
    pool: &sqlx::PgPool,
    store_id: &str,
) -> Result<Vec<database::schema::TransactRow>, sqlx::Error> {
    let customer_invoices: Vec<database::schema::TransactRow> = sqlx::query_as!(
        database::schema::TransactRow,
        r#"
        SELECT id, name_id, store_id, invoice_number, type_of AS "type_of!: database::schema::TransactRowType"
        FROM transact
        WHERE type_of = 'customer_invoice' AND store_id = $1
        "#,
        store_id
    )
    .fetch_all(pool)
    .await?;

    Ok(customer_invoices)
}

pub async fn select_transact_line_by_id(
    pool: &sqlx::PgPool,
    id: &str,
) -> Result<database::schema::TransactLineRow, sqlx::Error> {
    let transact_line: database::schema::TransactLineRow = sqlx::query_as!(
        database::schema::TransactLineRow,
        r#"
        SELECT id, transact_id, type_of AS "type_of!: database::schema::TransactLineRowType", item_id, item_line_id
        FROM transact_line
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(pool)
    .await?;

    Ok(transact_line)
}

pub async fn select_transact_lines_by_transact_id(
    pool: &sqlx::PgPool,
    transact_id: &str,
) -> Result<Vec<database::schema::TransactLineRow>, sqlx::Error> {
    let transact_lines: Vec<database::schema::TransactLineRow> = sqlx::query_as!(
        database::schema::TransactLineRow,
        r#"
        SELECT id, transact_id, type_of AS "type_of!: database::schema::TransactLineRowType", item_id, item_line_id
        FROM transact_line
        WHERE transact_id = $1
        "#,
        transact_id
    )
    .fetch_all(pool)
    .await?;

    Ok(transact_lines)
}
