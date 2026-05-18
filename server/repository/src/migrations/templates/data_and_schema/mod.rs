use crate::migrations::*;

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

// Simple example of migration that adds is_system_generated field to invoice and sets it to true
// if invoice was created by admin

table! {
    invoice (id) {
        id -> Text,
        is_system_generated -> Bool,
    }
}

table! {
    activity_log (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::migrations::templates::data_and_schema::ActivityLogTypeMapping,
        user_id -> Nullable<Text>,
        record_id -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ActivityLogType {
    InvoiceCreated,
}
#[allow(dead_code)]
pub(crate) struct V2_15_01;

impl Migration for V2_15_01 {
    fn version(&self) -> Version {
        Version::from_str("2.15.1")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use self::activity_log;
        use self::invoice;

        sql!(
            connection,
            r#"
            ALTER TABLE invoice ADD is_system_generated BOOLEAN NOT NULL DEFAULT false
        "#
        )?;

        let invoice_ids = activity_log::table
            .select(activity_log::record_id)
            .filter(
                activity_log::user_id
                    .eq("om_admin")
                    .and(activity_log::type_.eq(ActivityLogType::InvoiceCreated)),
            )
            .load::<Option<String>>(connection.lock().connection())?;

        for id in invoice_ids {
            let Some(id) = id else {
                continue;
            };

            diesel::update(invoice::table)
                .filter(invoice::id.eq(id))
                .set(invoice::is_system_generated.eq(true))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_2_15_01() {
    use crate::migrations::{v2_15_00::V2_15_00, *};
    use crate::test_db::*;
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    // For data migrations we want to insert data then do the migration, thus setup with version - 1
    // Then insert data and upgrade to this version

    let previous_version = V2_15_00.version();
    let version = V2_15_01.version();

    // Migrate to version - 1
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}_data_and_schema"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    use invoice;

    sql!(
        &connection,
        r#"
        INSERT INTO name 
        (id, type, is_customer, is_supplier, code, name)
        VALUES 
        ('name_id', 'STORE', false, false, '', '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO name_link
        (id, name_id)
        VALUES 
        ('name_link_id', 'name_id');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO store 
        (id, name_link_id, site_id, code)
        VALUES 
        ('store_id', 'name_link_id', 1, '');
    "#
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            r#"
            INSERT INTO invoice 
            (id, store_id, name_link_id, invoice_number, type, status, on_hold, created_datetime) 
            VALUES 
            ('invoice1_id', 'store_id', 'name_link_id', 1, 'INBOUND_SHIPMENT', 'NEW', false, $1);
        "#
            .to_string(),
        )
        .bind::<Timestamp, _>(chrono::Utc::now().naive_utc()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            (r#"
            INSERT INTO invoice 
            (id, store_id, name_link_id, invoice_number, type, status, on_hold, created_datetime) 
            VALUES 
            ('invoice2_id', 'store_id', 'name_link_id', 2, 'INBOUND_SHIPMENT', 'NEW', false, $1);
        "#)
            .to_string(),
        )
        .bind::<Timestamp, _>(chrono::Utc::now().naive_utc()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            (r#"
            INSERT INTO activity_log 
            (id, user_id, record_id, type, datetime) 
            VALUES 
            ('log1', 'om_admin', 'invoice2_id', 'INVOICE_DELETED', $1);
        "#)
            .to_string(),
        )
        .bind::<Timestamp, _>(chrono::Utc::now().naive_utc()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            (r#"
            INSERT INTO activity_log 
            (id, user_id, record_id, type, datetime) 
            VALUES 
            ('log2', 'some_user', 'invoice2_id', 'INVOICE_CREATED', $1);
        "#)
            .to_string(),
        )
        .bind::<Timestamp, _>(chrono::Utc::now().naive_utc()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            (r#"
            INSERT INTO activity_log 
            (id, user_id, record_id, type, datetime) 
            VALUES 
            ('log3', 'om_admin', 'invoice1_id', 'INVOICE_CREATED', $1);
        "#)
            .to_string(),
        )
        .bind::<Timestamp, _>(chrono::Utc::now().naive_utc()),
    )
    .unwrap();

    // Migrate to this version
    // Since this test refers to a migration we don't want it production, we can't use the main migration to this version.
    // So manually run just this test migration...
    // In a real example you'd use `migrate(&connection, Some(version.clone())).unwrap();` instead
    V2_15_01.migrate(&connection).unwrap();
    // In a real test, you'd check the version was updated correctly
    // e.g. assert_eq!(get_database_version(&connection), version);

    // Check data
    let invoices = invoice::table
        .select((invoice::id, invoice::is_system_generated))
        .order_by(invoice::id.asc())
        .load::<(String, bool)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        invoices,
        vec![
            ("invoice1_id".to_string(), true),
            ("invoice2_id".to_string(), false)
        ]
    )
}
