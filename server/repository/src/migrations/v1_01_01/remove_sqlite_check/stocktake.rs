use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
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
    let mut connection = super::setup_data_migration("remove_sqlite_check_stocktake").await;

    let default = "1, 'store_id', '', ''";
    sql!(
        &mut connection,
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
    migrate(&mut connection, Some(V1_01_01.version())).unwrap();
    assert_eq!(get_database_version(&mut connection), V1_01_01.version());

    // Make sure check was removed
    sql!(
        &mut connection,
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
    use stocktake::dsl as stocktake_dsl;

    let stocktakes = stocktake_dsl::stocktake
        .select((stocktake_dsl::id, stocktake_dsl::status))
        .order_by(stocktake_dsl::id.asc())
        .load::<(String, String)>(&mut connection.connection)
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
