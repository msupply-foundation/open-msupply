use super::{version::Version, Migration};
use crate::{migrations::sql, StorageConnection};
mod name_tags;
mod period_and_period_schedule;

pub(crate) struct V1_01_11;

impl Migration for V1_01_11 {
    fn version(&self) -> Version {
        Version::from_str("1.1.11")
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"ALTER TYPE activity_log_type ADD VALUE 'INVOICE_NUMBER_ALLOCATED';"#
        )?;
        sql!(
            connection,
            r#"ALTER TYPE activity_log_type ADD VALUE 'REQUISITION_NUMBER_ALLOCATED';"#
        )?;
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN requisitions_require_supplier_authorisation bool NOT NULL DEFAULT false;
        "#
        )?;

        // TODO move store_preference to it's own migration, before PR merge? I'm doing this duplication temporarily to avoid more merge conflicts from develop changes...
        name_tags::migrate(connection)?;
        period_and_period_schedule::migrate(connection)?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN requisitions_require_supplier_authorisation bool NOT NULL DEFAULT false;
        "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE program (
                id TEXT NOT NULL REFERENCES master_list(id) PRIMARY KEY,
                name TEXT NOT NULL
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE program_requisition_settings (
                id TEXT NOT NULL PRIMARY KEY,
                name_tag_id NOT NULL REFERENCES name_tag(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id)
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE program_requisition_order_type (
                id TEXT NOT NULL PRIMARY KEY,
                program_requisition_settings_id TEXT NOT NULL REFERENCES program_requisition_settings(id),
                name TEXT NOT NULL,
                threshold_mos {DOUBLE} NOT NULL,
                max_mos {DOUBLE} NOT NULL,
                max_order_per_period {DOUBLE} NOT NULL
            );
            "#
        )?;

        name_tags::migrate(connection)?;
        period_and_period_schedule::migrate(connection)?;

        Ok(())
    }
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_01_11() {
    use crate::migrations::*;
    use crate::test_db::*;

    let version = V1_01_11.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}"),
        version: Some(version.clone()),
        ..Default::default()
    })
    .await;

    assert_eq!(get_database_version(&connection), version);
}
