use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_goods_received_report_context"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE report
                SET context = 'GOODS_RECEIVED'
                WHERE code = 'goods-received'
                AND context = 'PURCHASE_ORDER';
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_report_context() {
    use crate::db_diesel::report_row::{report, ContextType};
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;

    let previous_version = v2_10_00::V2_10_00.version();
    let version = v2_11_00::V2_11_00.version();
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}_report_context"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    sql!(
        &connection,
        r#"
            INSERT INTO report (id, name, template, context, code, version, is_custom, is_active)
            VALUES ('goods_received_1', 'Goods Received Report', '', 'PURCHASE_ORDER', 'goods-received', '1.0.0', false, true);
        "#
    ).unwrap();

    let reports_before_migration = report::table
        .select((report::code, report::context))
        .filter(report::code.eq("goods-received"))
        .load::<(String, ContextType)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        reports_before_migration,
        vec![("goods-received".to_string(), ContextType::PurchaseOrder)]
    );

    // Run migration
    migrate(&connection, Some(version.clone())).unwrap();

    let reports_after_migration = report::table
        .select((report::code, report::context))
        .filter(report::code.eq("goods-received"))
        .load::<(String, ContextType)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        reports_after_migration,
        vec![("goods-received".to_string(), ContextType::GoodsReceived)]
    );
}
