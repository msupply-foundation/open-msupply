use crate::service_provider::ServiceContext;
use repository::{RepositoryError, SiteRow, SiteRowRepository};

#[derive(PartialEq, Debug)]
pub enum ClearSiteTokenError {
    SiteDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn clear_site_token(ctx: &ServiceContext, site_id: i32) -> Result<i32, ClearSiteTokenError> {
    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);

            let site = repo
                .find_one_by_id(site_id)?
                .ok_or(ClearSiteTokenError::SiteDoesNotExist)?;

            repo.upsert(&SiteRow {
                token: None,
                ..site
            })?;
            Ok(site_id)
        })
        .map_err(|e| e.to_inner_error())
}

impl From<RepositoryError> for ClearSiteTokenError {
    fn from(error: RepositoryError) -> Self {
        ClearSiteTokenError::DatabaseError(error)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, SiteRow, SiteRowRepository, StorageConnection,
        SyncVersion,
    };

    fn site(connection: &StorageConnection, token: Option<String>) -> SiteRow {
        let row = SiteRow {
            id: 1,
            og_id: None,
            code: "code1".to_string(),
            name: "Site A".to_string(),
            hashed_password: "hash".to_string(),
            hardware_id: Some("hw-1".to_string()),
            token,
            sync_version: SyncVersion::V5V6,
        };
        SiteRowRepository::new(connection).upsert(&row).unwrap();
        row
    }

    #[actix_rt::test]
    async fn clear_site_token_errors() {
        let (_, _, connection_manager, _) =
            setup_all("clear_site_token_errors", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        assert_eq!(
            clear_site_token(&context, 999),
            Err(ClearSiteTokenError::SiteDoesNotExist)
        );
    }

    #[actix_rt::test]
    async fn clear_site_token_success() {
        let (_, connection, connection_manager, _) =
            setup_all("clear_site_token_success", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let site = site(&connection, Some("existing_token".to_string()));

        let id = clear_site_token(&context, site.id).unwrap();
        assert_eq!(id, site.id);

        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(site.id)
            .unwrap()
            .unwrap();
        assert_eq!(stored.token, None);
        assert_eq!(stored.hardware_id.as_deref(), Some("hw-1"));
        assert_eq!(stored.name, "Site A");
    }
}
