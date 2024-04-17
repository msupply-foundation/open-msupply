use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE requisition ADD COLUMN status_temp NOT NULL DEFAULT 'DRAFT';
            ALTER TABLE requisition ADD COLUMN type_temp NOT NULL DEFAULT 'REQUEST';

            UPDATE requisition SET status_temp = status;
            UPDATE requisition SET type_temp = type;

            ALTER TABLE requisition DROP COLUMN status;
            ALTER TABLE requisition DROP COLUMN type;

            ALTER TABLE requisition RENAME COLUMN status_temp TO status;
            ALTER TABLE requisition RENAME COLUMN type_temp to type;
        "#
    )?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn remove_sqlite_check_requisition() {
    use crate::migrations::*;
    use diesel::prelude::*;
    let connection = super::setup_data_migration("remove_sqlite_check_requisition").await;

    let default = "1, 'store_id', 'name_id', 1, 1, ''";
    sql!(&connection,
    r#"
        INSERT INTO requisition
        (id, requisition_number, store_id, name_id, max_months_of_stock, min_months_of_stock, created_datetime, type, status)
        VALUES
            ('requisition1', {default}, 'REQUEST', 'DRAFT'),
            ('requisition2', {default}, 'RESPONSE', 'NEW'),
            ('requisition3', {default}, 'REQUEST', 'SENT');
    "#
    )
   .unwrap();
    // Migrate to this version
    migrate(&connection, Some(V1_01_01.version())).unwrap();
    assert_eq!(get_database_version(&connection), V1_01_01.version());

    // Make sure check was removed
    sql!(&connection,
    r#"
        INSERT INTO requisition
        (id, requisition_number, store_id, name_id, max_months_of_stock, min_months_of_stock, created_datetime, type, status)
        VALUES
            ('requisition4', {default}, 'not checked', 'not checked');
    "#
    ).unwrap();

    table! {
        requisition (id) {
            id -> Text,
            #[sql_name = "type"] type_ -> Text,
            status -> Text,
        }
    }
    use requisition::dsl as requisition_dsl;
    let requisitions = requisition_dsl::requisition
        .select((
            requisition_dsl::id,
            requisition_dsl::type_,
            requisition_dsl::status,
        ))
        .order_by(requisition_dsl::id.asc())
        .load::<(String, String, String)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        requisitions,
        vec![
            (
                "requisition1".to_string(),
                "REQUEST".to_string(),
                "DRAFT".to_string()
            ),
            (
                "requisition2".to_string(),
                "RESPONSE".to_string(),
                "NEW".to_string()
            ),
            (
                "requisition3".to_string(),
                "REQUEST".to_string(),
                "SENT".to_string()
            ),
            (
                "requisition4".to_string(),
                "not checked".to_string(),
                "not checked".to_string()
            )
        ]
    )
}
