use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE stocktake ADD COLUMN status_temp NOT NULL DEFAULT 'NEW';

            UPDATE stocktake SET status_temp = status;

            ALTER TABLE stocktake DROP COLUMN status;

            ALTER TABLE stocktake RENAME COLUMN status_temp TO status;
        "#
    )?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn remove_sqlite_check_stocktake() {
    use crate::migrations::*;
    use diesel::prelude::*;
    let connection = super::setup_data_migration("remove_sqlite_check_stocktake").await;

    let default = "1, 'store_id', '', ''";
    sql!(
        &connection,
        r#"
            INSERT INTO stocktake
            (id, stocktake_number, store_id, user_id, created_datetime, status)
            VALUES
                ('stocktake1', {default}, 'NEW'),
                ('stocktake2', {default}, 'FINALISED'),
                ('stocktake3', {default}, 'NEW');
        "#
    )
    .unwrap();

    // Migrate to this version
    migrate(&connection, Some(V1_01_01.version())).unwrap();
    assert_eq!(get_database_version(&connection), V1_01_01.version());

    // Make sure check was removed
    sql!(
        &connection,
        r#"
            INSERT INTO stocktake
            (id, stocktake_number, store_id, user_id, created_datetime, status)
            VALUES
                ('stocktake4', {default}, 'not checked')
        "#
    )
    .unwrap();

    table! {
        stocktake (id) {
            id -> Text,
            status -> Text,
        }
    }

    let stocktakes = stocktake::table
        .select((stocktake::id, stocktake::status))
        .order_by(stocktake::id.asc())
        .load::<(String, String)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        stocktakes,
        vec![
            ("stocktake1".to_string(), "NEW".to_string(),),
            ("stocktake2".to_string(), "FINALISED".to_string(),),
            ("stocktake3".to_string(), "NEW".to_string(),),
            ("stocktake4".to_string(), "not checked".to_string(),)
        ]
    )
}
