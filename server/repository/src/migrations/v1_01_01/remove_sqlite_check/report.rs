use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE report ADD COLUMN context_temp NOT NULL DEFAULT 'INBOUND_SHIPMENT';
            ALTER TABLE report ADD COLUMN type_temp NOT NULL DEFAULT 'OM_SUPPLY';

            UPDATE report SET context_temp = context;
            UPDATE report SET type_temp = type;

            ALTER TABLE report DROP COLUMN context;
            ALTER TABLE report DROP COLUMN type;

            ALTER TABLE report RENAME COLUMN context_temp TO context;
            ALTER TABLE report RENAME COLUMN type_temp to type;
        "#
    )?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn remove_sqlite_check_report() {
    use crate::migrations::*;
    use diesel::prelude::*;
    let connection = super::setup_data_migration("remove_sqlite_check_report").await;

    sql!(
        &connection,
        r#"
            INSERT INTO report (id, type, context, template, name)
            VALUES 
                ('report1', 'OM_SUPPLY', 'INBOUND_SHIPMENT', '', ''),
                ('report2', 'OM_SUPPLY', 'OUTBOUND_SHIPMENT', '', ''),
                ('report3', 'OM_SUPPLY', 'INBOUND_SHIPMENT', '', '');
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
        INSERT INTO report (id, type, context, name, template) 
        VALUES ('report4', 'not checked', 'not checked', '', '');
    "#
    )
    .unwrap();

    table! {
        report (id) {
            id -> Text,
            #[sql_name = "type"] type_ -> Text,
            context -> Text,
        }
    }
    use report::dsl as report_dsl;

    let reports = report_dsl::report
        .select((report_dsl::id, report_dsl::type_, report_dsl::context))
        .order_by(report_dsl::id.asc())
        .load::<(String, String, String)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        reports,
        vec![
            (
                "report1".to_string(),
                "OM_SUPPLY".to_string(),
                "INBOUND_SHIPMENT".to_string()
            ),
            (
                "report2".to_string(),
                "OM_SUPPLY".to_string(),
                "OUTBOUND_SHIPMENT".to_string()
            ),
            (
                "report3".to_string(),
                "OM_SUPPLY".to_string(),
                "INBOUND_SHIPMENT".to_string()
            ),
            (
                "report4".to_string(),
                "not checked".to_string(),
                "not checked".to_string()
            )
        ]
    )
}
