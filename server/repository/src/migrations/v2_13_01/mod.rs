use super::{version::Version, Migration, MigrationFragment};
use crate::StorageConnection;

mod can_edit_asset_status_permission;
mod reintegrate_assets_and_asset_logs;
mod remove_fk_on_asset_internal_location;
mod update_store_id_for_asset_internal_location_changelog;

pub(crate) struct V2_13_01;
impl Migration for V2_13_01 {
    fn version(&self) -> Version {
        Version::from_str("2.13.1")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }

    fn migrate_fragments(&self) -> Vec<Box<dyn MigrationFragment>> {
        vec![
            Box::new(reintegrate_assets_and_asset_logs::Migrate),
            Box::new(can_edit_asset_status_permission::Migrate),
            Box::new(remove_fk_on_asset_internal_location::Migrate),
            Box::new(update_store_id_for_asset_internal_location_changelog::Migrate),
        ]
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_13_01() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_13_00::V2_13_00;
        use v2_13_01::V2_13_01;

        let previous_version = V2_13_00.version();
        let version = V2_13_01.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        sql!(
            &connection,
            r#"
                INSERT INTO name 
                (id, type, is_customer, is_supplier, code, name)
                VALUES 
                ('name_id', 'STORE', false, false, 'store_a', 'Store A');
            "#
        )
        .unwrap();

        sql!(
            &connection,
            r#"
                INSERT INTO name_link 
                (id, name_id)
                VALUES 
                ('store_a', 'name_id');
            "#
        )
        .unwrap();

        sql!(
            &connection,
            r#"
                INSERT INTO store 
                (id, code, site_id, name_link_id)
                VALUES 
                ('store_a', 'store_a', '123', 'store_a');
            "#
        )
        .unwrap();

        sql!(
            &connection,
            r#"
                INSERT INTO location 
                (id, code, name, on_hold, store_id)
                VALUES 
                ('location_1', 'location_1', 'Location 1', false, 'store_a');
            "#
        )
        .unwrap();

        sql!(
            &connection,
            r#"
                INSERT INTO asset 
                (id, store_id, created_datetime, modified_datetime)
                VALUES 
                ('asset_a', 'store_a', '2022-01-01T00:00:00Z', '2022-01-01T00:00:00Z');
            "#
        )
        .unwrap();

        sql!(
            &connection,
            r#"
                INSERT INTO asset_internal_location 
                (id, asset_id, location_id)
                VALUES 
                ('id', 'asset_a', 'location_1');
            "#
        )
        .unwrap();

        // Run this migration
        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}
