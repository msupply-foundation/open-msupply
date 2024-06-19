use crate::migrations::*;

use chrono::{Duration, NaiveDateTime};
use diesel::prelude::*;

// In this example we do simple migration of data, by adding one day to invoice row created datetime
// we can't use diesel definitions from repositories since they refer to the latest shape
// of the schema, which will likely be different from schema in this migration
// thus we need to user pure SQL or new diesel definitions

// Here we would use simple invoice diesel definitions, for actual migration, since diesel
// knows how to handle NaiveDateTime serialisation for both sqlite and postgres

// In tests we use SQL statements for inserting test data, can also use new diesel definitions
// but this could bloat compile time and is quite a lot of boilerplate for the task

// We only need definitions for update and select of id and created_datetime
table! {
    invoice (id) {
        id -> Text,
        created_datetime -> Timestamp,
    }
}

pub(crate) struct V1_00_06;

impl Migration for V1_00_06 {
    fn version(&self) -> Version {
        Version::from_str("1.0.6")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use self::invoice::dsl as invoice_dsl;
        let invoices = invoice_dsl::invoice
            .select((invoice_dsl::id, invoice_dsl::created_datetime))
            .load::<(String, NaiveDateTime)>(connection.lock().connection())?;

        let duration_offset = Duration::days(1);

        for (id, datetime) in invoices {
            let new_datetime = datetime
                .checked_add_signed(duration_offset)
                .unwrap_or(datetime);

            diesel::update(invoice_dsl::invoice)
                .filter(invoice_dsl::id.eq(id))
                .set(invoice_dsl::created_datetime.eq(new_datetime))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_00_06() {
    use crate::migrations::*;
    use crate::test_db::*;
    use chrono::{NaiveDate, NaiveDateTime};
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    // For data migrations we want to insert data then do the migration, thus setup with version - 1
    // Then insert data and upgrade to this version

    let previous_version = V1_00_04.version();
    let version = V1_00_06.version();

    // Migrate to version - 1
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    use invoice::dsl as invoice_dsl;

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
        INSERT INTO store 
        (id, name_id, site_id, code)
        VALUES 
        ('store_id', 'name_id', 1, '');
    "#
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            (r#"
            INSERT INTO invoice 
            (id, store_id, name_id, invoice_number, type, status, on_hold, created_datetime) 
            VALUES 
            ('invoice1_id', 'store_id', 'name_id', 1, 'INBOUND_SHIPMENT', 'NEW', false, $1);
        "#)
            .to_string(),
        )
        .bind::<Timestamp, _>(
            NaiveDate::from_ymd_opt(2011, 10, 9)
                .unwrap()
                .and_hms_opt(10, 10, 10)
                .unwrap(),
        ),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(
            (r#"
            INSERT INTO invoice 
            (id, store_id, name_id, invoice_number, type, status, on_hold, created_datetime) 
            VALUES 
            ('invoice2_id', 'store_id', 'name_id', 2, 'INBOUND_SHIPMENT', 'NEW', false, $1);
        "#)
            .to_string(),
        )
        .bind::<Timestamp, _>(
            NaiveDate::from_ymd_opt(2022, 1, 3)
                .unwrap()
                .and_hms_opt(1, 2, 3)
                .unwrap(),
        ),
    )
    .unwrap();

    // Migrate to this version
    // Since this test refers to a migration we don't want it production, we can't use the main migration to this version.
    // So manually run just this test migration...
    // In a real example you'd use `migrate(&connection, Some(version.clone())).unwrap();` instead
    V1_00_06.migrate(&connection).unwrap();
    // In a real test, you'd check the version was updated correctly
    // e.g. assert_eq!(get_database_version(&connection), version);
    let _ = connection.lock();
    assert_eq!(1, 1);

    // Check data
    let invoices = invoice_dsl::invoice
        .select((invoice_dsl::id, invoice_dsl::created_datetime))
        .order_by(invoice_dsl::id.asc())
        .load::<(String, NaiveDateTime)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        invoices,
        vec![
            (
                "invoice1_id".to_string(),
                NaiveDate::from_ymd_opt(2011, 10, 10)
                    .unwrap()
                    .and_hms_opt(10, 10, 10)
                    .unwrap()
            ),
            (
                "invoice2_id".to_string(),
                NaiveDate::from_ymd_opt(2022, 1, 4)
                    .unwrap()
                    .and_hms_opt(1, 2, 3)
                    .unwrap()
            )
        ]
    )
}
