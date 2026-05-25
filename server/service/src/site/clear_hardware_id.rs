use crate::service_provider::ServiceContext;
use repository::{RepositoryError, SiteRow, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum ClearSiteHardwareIdError {
    SiteDoesNotExist,
    DatabaseError(RepositoryError),
}

/// Clear the `hardware_id` for the site with id `site_id`.
/// Returns `Result`` with the site's id if successful or a `ClearSiteHardwareIdError`
pub fn clear_site_hardware_id(
    ctx: &ServiceContext,
    site_id: i32,
) -> Result<i32, ClearSiteHardwareIdError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);

            let site = repo
                .find_one_by_id(site_id)?
                .ok_or(ClearSiteHardwareIdError::SiteDoesNotExist)?;

            repo.upsert(&SiteRow {
                hardware_id: None,
                ..site
            })?;
            Ok(site_id)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for ClearSiteHardwareIdError {
    fn from(error: RepositoryError) -> Self {
        ClearSiteHardwareIdError::DatabaseError(error)
    }
}

#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all, StorageConnection, SyncVersion};

    use crate::service_provider::ServiceProvider;

    use super::*;

    fn site(connection: &StorageConnection, hardware_id: Option<String>) -> SiteRow {
        let row = SiteRow {
            id: 1,
            og_id: None,
            code: "code1".to_string(),
            name: "Site A".to_string(),
            hashed_password: "hash".to_string(),
            hardware_id,
            token: Some("token".to_string()),
            sync_version: SyncVersion::V7,
        };
        SiteRowRepository::new(connection).upsert(&row).unwrap();
        row
    }

    #[actix_rt::test]
    async fn clear_site_hardware_id_errors() {
        let (_, _, connection_manager, _) =
            setup_all("clear_site_hardware_id_errors", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            clear_site_hardware_id(&context, 1001),
            Err(ClearSiteHardwareIdError::SiteDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn clear_site_hardware_id_success() {
        let (_, connection, connection_manager, _) =
            setup_all("clear_site_hardware_id_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let site = site(&connection, Some("existing_hardware_id".to_string()));

        let id = clear_site_hardware_id(&context, site.id).unwrap();
        assert_eq!(id, site.id);

        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(site.id)
            .unwrap()
            .unwrap();
        assert!(stored.hardware_id.is_none());
        assert_eq!(stored.token, Some("token".to_string()));
        assert_eq!(stored.name, "Site A");
    }
}
