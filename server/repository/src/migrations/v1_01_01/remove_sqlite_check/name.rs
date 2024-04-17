use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE name ADD COLUMN gender_temp;
            ALTER TABLE name ADD COLUMN type_temp NOT NULL DEFAULT 'FACILITY';

            UPDATE name SET gender_temp = gender;
            UPDATE name SET type_temp = type;

            ALTER TABLE name DROP COLUMN gender;
            ALTER TABLE name DROP COLUMN type;

            ALTER TABLE name RENAME COLUMN gender_temp TO gender;
            ALTER TABLE name RENAME COLUMN type_temp to type;
        "#
    )?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn remove_sqlite_check_name() {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: "remove_sqlite_check_name",
        version: Some(templates::add_data_from_sync_buffer::V1_00_08.version()),
        ..Default::default()
    })
    .await;

    let default = "'', '', true, true";
    sql!(
        &connection,
        r#"
        INSERT INTO name
        (id, name, code, is_customer, is_supplier, type, gender)
        VALUES
            ('name1', {default}, 'FACILITY', 'FEMALE'),
            ('name2', {default}, 'PATIENT', 'MALE'),
            ('name3', {default}, 'BUILD', 'UNKNOWN');
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
        INSERT INTO name
        (id, name, code, is_customer, is_supplier, type, gender)
        VALUES
            ('name4', {default}, 'not checked', 'not checked');
    "#
    )
    .unwrap();

    table! {
        name (id) {
            id -> Text,
            #[sql_name = "type"] type_ -> Text,
            gender -> Text,
        }
    }
    use name::dsl as name_dsl;
    let names = name_dsl::name
        .select((name_dsl::id, name_dsl::type_, name_dsl::gender))
        .order_by(name_dsl::id.asc())
        .load::<(String, String, String)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        names,
        vec![
            (
                "name1".to_string(),
                "FACILITY".to_string(),
                "FEMALE".to_string()
            ),
            (
                "name2".to_string(),
                "PATIENT".to_string(),
                "MALE".to_string()
            ),
            (
                "name3".to_string(),
                "BUILD".to_string(),
                "UNKNOWN".to_string()
            ),
            (
                "name4".to_string(),
                "not checked".to_string(),
                "not checked".to_string()
            ),
        ]
    )
}
