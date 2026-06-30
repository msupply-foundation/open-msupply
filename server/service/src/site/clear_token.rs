use crate::service_provider::ServiceContext;
use repository::{
    KeyType, KeyValueStoreRepository, RepositoryError, SiteRow, SiteRowRepository, SyncVersion,
};

#[derive(PartialEq, Debug)]
pub enum ClearSiteTokenError {
    SiteDoesNotExist,
    SameSite,
    /// Clearing is only safe for v7 sites; legacy (v5/v6) sites manage their token
    /// via 4D. See issue #11784.
    SiteIsNotV7,
    DatabaseError(RepositoryError),
}

pub fn clear_site_token(ctx: &ServiceContext, site_id: i32) -> Result<i32, ClearSiteTokenError> {
    let current_site_id =
        KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

    if current_site_id == Some(site_id) {
        return Err(ClearSiteTokenError::SameSite);
    }

    ctx.connection
        .transaction_sync(|connection| {
            let repo = SiteRowRepository::new(connection);

            let site = repo
                .find_one_by_id(site_id)?
                .ok_or(ClearSiteTokenError::SiteDoesNotExist)?;

            if site.sync_version != SyncVersion::V7 {
                return Err(ClearSiteTokenError::SiteIsNotV7);
            }

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
        mock::MockDataInserts, test_db::setup_all, KeyType, KeyValueStoreRepository, SiteRow,
        SiteRowRepository, StorageConnection, SyncVersion,
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
            sync_version: SyncVersion::V7,
            ..Default::default()
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
    async fn clear_site_token_same_site_errors() {
        let (_, connection, connection_manager, _) =
            setup_all("clear_site_token_same_site", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        let site = site(&connection, Some("token".to_string()));
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(site.id))
            .unwrap();

        assert_eq!(
            clear_site_token(&context, site.id),
            Err(ClearSiteTokenError::SameSite)
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

    #[actix_rt::test]
    async fn clear_site_token_rejects_non_v7() {
        let (_, connection, connection_manager, _) =
            setup_all("clear_site_token_rejects_non_v7", MockDataInserts::none()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();

        SiteRowRepository::new(&connection)
            .upsert(&SiteRow {
                id: 5,
                name: "Legacy Site".to_string(),
                token: Some("legacy-token".to_string()),
                sync_version: SyncVersion::V5V6,
                ..Default::default()
            })
            .unwrap();

        assert_eq!(
            clear_site_token(&context, 5),
            Err(ClearSiteTokenError::SiteIsNotV7)
        );
        // The token must be left untouched for non-v7 sites.
        let stored = SiteRowRepository::new(&connection)
            .find_one_by_id(5)
            .unwrap()
            .unwrap();
        assert_eq!(stored.token.as_deref(), Some("legacy-token"));
    }
}
