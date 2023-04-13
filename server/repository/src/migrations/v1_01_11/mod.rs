use super::{version::Version, Migration};
use crate::{migrations::sql, StorageConnection};
mod name_tags;
mod period_and_period_schedule;
mod program_requisition;

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
        program_requisition::migrate(connection)?;

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

        name_tags::migrate(connection)?;
        period_and_period_schedule::migrate(connection)?;
        program_requisition::migrate(connection)?;

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
