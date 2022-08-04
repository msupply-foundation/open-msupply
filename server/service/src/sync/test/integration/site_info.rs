#[cfg(test)]
mod tests {
    use repository::{KeyValueStoreRepository, KeyValueType};
    use crate::sync::test::integration::{central_server_configurations::{ConfigureCentralServer, CreateSyncSiteResult}, init_db};


    #[actix_rt::test]
    async fn integration_sync_request_and_persist_site_info() {
        let CreateSyncSiteResult { sync_settings, new_site_properties } = ConfigureCentralServer::from_env()
            .create_sync_site()
            .await
            .expect("Problem creating sync site");

        let (connection, synchroniser) = init_db(&sync_settings, "site_info").await;

        synchroniser.sync().await.unwrap();

        let repo = KeyValueStoreRepository::new(&connection);

        assert_eq!(repo.get_i32(KeyValueType::SettingsSyncSiteId), Ok(Some(new_site_properties.site_id)));
        assert_eq!(repo.get_string(KeyValueType::SettingsSyncSiteUuid), Ok(Some(new_site_properties.site_uuid)));
    }
}
