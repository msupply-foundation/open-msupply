use super::{version::Version, Migration};
use crate::StorageConnection;

pub(crate) struct V2_17_05;
impl Migration for V2_17_05 {
    fn version(&self) -> Version {
        Version::from_str("2.17.5")
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
mod test {
    #[actix_rt::test]
    async fn migration_2_17_05() {
        use crate::migrations::*;
        use crate::test_db::*;
        use v2_17_03::V2_17_03;
        use v2_17_05::V2_17_05;

        let previous_version = V2_17_03.version();
        let version = V2_17_05.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{version}"),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);
    }
}
