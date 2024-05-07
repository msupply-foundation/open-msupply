#[cfg(test)]
mod tests {
    use crate::sync::test::integration::{
        central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
        init_test_context, SyncIntegrationContext,
    };
    use repository::{KeyType, KeyValueStoreRepository};

    #[actix_rt::test]
    async fn integration_sync_request_and_persist_site_info() {
        let SiteConfiguration {
            sync_settings,
            new_site_properties,
        } = ConfigureCentralServer::from_env()
            .create_sync_site(vec![])
            .await
            .expect("Problem creating sync site");

        let SyncIntegrationContext {
            connection,
            synchroniser,
            ..
        } = init_test_context(&sync_settings, "site_info").await;

        synchroniser.sync().await.unwrap();

        let repo = KeyValueStoreRepository::new(&connection);

        assert_eq!(
            repo.get_i32(KeyType::SettingsSyncSiteId),
            Ok(Some(new_site_properties.site_id))
        );
        assert_eq!(
            repo.get_string(KeyType::SettingsSyncSiteUuid),
            Ok(Some(new_site_properties.site_uuid))
        );
    }
}
