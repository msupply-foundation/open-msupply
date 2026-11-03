use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_visible_to_name_store_join"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Whether the name is visible in the store: the inverse of OG's `inactive` on
        // the join. A join that isn't visible still routes the name's records to the
        // store's site
        sql!(
            connection,
            r#"
                ALTER TABLE name_store_join
                ADD COLUMN visible BOOLEAN NOT NULL DEFAULT TRUE;
            "#
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::prelude::*;

    table! {
        name_store_join (id) {
            id -> Text,
            visible -> Bool,
        }
    }

    #[actix_rt::test]
    async fn migration_add_visible_to_name_store_join() {
        let previous_version = v3_02_00::V3_02_00.version();
        let version = v3_04_00::V3_04_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}_add_visible_to_name_store_join"),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        sql!(
            &connection,
            r#"
            INSERT INTO name (id, type, is_customer, is_supplier, code, name)
            VALUES ('patient', 'PATIENT', true, false, 'P1', 'Patient');
            INSERT INTO name_link (id, name_id) VALUES ('patient', 'patient');
            INSERT INTO name (id, type, is_customer, is_supplier, code, name)
            VALUES ('store_name', 'STORE', true, false, 'S1', 'Store');
            INSERT INTO name_link (id, name_id) VALUES ('store_name', 'store_name');
            INSERT INTO store (id, name_link_id, code, site_id)
            VALUES ('store', 'store_name', 'S1', 1);
            INSERT INTO name_store_join (id, name_link_id, store_id, name_is_customer, name_is_supplier)
            VALUES ('join', 'patient', 'store', true, false);
            "#
        )
        .unwrap();

        migrate(&connection, Some(version), MigrationConfig::default()).unwrap();

        let rows = name_store_join::table
            .select((name_store_join::id, name_store_join::visible))
            .load::<(String, bool)>(connection.lock().connection())
            .unwrap();

        assert_eq!(rows, vec![("join".to_string(), true)]);
    }
}
