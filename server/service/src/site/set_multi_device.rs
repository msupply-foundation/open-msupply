use crate::service_provider::ServiceContext;
use repository::{KeyType, KeyValueStoreRepository, RepositoryError, SiteRow, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum SetSiteMultiDeviceError {
    SiteDoesNotExist,
    SameSite,
    DatabaseError(RepositoryError),
}

/// Marks (or unmarks) a site as multi device. Toggling only changes the flag; the
/// token and hardware id are kept.
pub fn set_site_multi_device(
    ctx: &ServiceContext,
    site_id: i32,
    is_multi_device: bool,
) -> Result<i32, SetSiteMultiDeviceError> {
    // A server should not flip the multi device flag on its own site, the same
    // way it cannot clear its own hardware id.
    let current_site_id =
        KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;
    if current_site_id == Some(site_id) {
        return Err(SetSiteMultiDeviceError::SameSite);
    }

    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);

            let site = repo
                .find_one_by_id(site_id)?
                .ok_or(SetSiteMultiDeviceError::SiteDoesNotExist)?;

            repo.upsert(&SiteRow {
                is_multi_device,
                ..site
            })?;
            Ok(site_id)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for SetSiteMultiDeviceError {
    fn from(error: RepositoryError) -> Self {
        SetSiteMultiDeviceError::DatabaseError(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, KeyType, KeyValueStoreRepository, SiteRow,
        SiteRowRepository, StorageConnection, SyncVersion,
    };

    fn site(connection: &StorageConnection) -> SiteRow {
        let row = SiteRow {
            id: 1,
            og_id: None,
            code: "code1".to_string(),
            name: "Site A".to_string(),
            hashed_password: "hash".to_string(),
            hardware_id: Some("hw-1".to_string()),
            is_multi_device: false,
            token: Some("token".to_string()),
            sync_version: SyncVersion::V7,
            app_name: None,
            app_version: None,
            last_connection_datetime: None,
            last_sync_datetime: None,
            first_sync_datetime: None,
        };
        SiteRowRepository::new(connection).upsert(&row).unwrap();
        row
    }

    #[actix_rt::test]
    async fn set_site_multi_device_errors() {
        let (_, _, connection_manager, _) =
            setup_all("set_site_multi_device_errors", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            set_site_multi_device(&context, 999, true),
            Err(SetSiteMultiDeviceError::SiteDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn set_site_multi_device_same_site_errors() {
        let (_, connection, connection_manager, _) =
            setup_all("set_site_multi_device_same_site", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let site = site(&connection);
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(site.id))
            .unwrap();

        assert_eq!(
            set_site_multi_device(&context, site.id, true),
            Err(SetSiteMultiDeviceError::SameSite)
        );
    }

    #[actix_rt::test]
    async fn set_site_multi_device_success() {
        let (_, connection, connection_manager, _) =
            setup_all("set_site_multi_device_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let site = site(&connection);
        let repo = SiteRowRepository::new(&connection);

        set_site_multi_device(&context, site.id, true).unwrap();
        let stored = repo.find_one_by_id(site.id).unwrap().unwrap();
        assert!(stored.is_multi_device);
        // Token and hardware id are preserved across the toggle.
        assert_eq!(stored.token.as_deref(), Some("token"));
        assert_eq!(stored.hardware_id.as_deref(), Some("hw-1"));

        set_site_multi_device(&context, site.id, false).unwrap();
        let stored = repo.find_one_by_id(site.id).unwrap().unwrap();
        assert!(!stored.is_multi_device);
        assert_eq!(stored.token.as_deref(), Some("token"));
    }
}
