#[cfg(test)]
mod tests {
    use crate::{
        sync::test::integration::{
            central_server_configurations::SiteConfiguration, create_site, FullSiteConfig,
        },
        test_helpers::ServiceTestContext,
    };
    use repository::{KeyType, KeyValueStoreRepository};

    #[actix_rt::test]
    async fn integration_sync_request_and_persist_site_info() {
        let FullSiteConfig {
            context: ServiceTestContext { connection, .. },
            config:
                SiteConfiguration {
                    new_site_properties,
                    ..
                },
            synchroniser,
        } = create_site("site_info", vec![]).await;

        synchroniser.sync(None).await.unwrap();

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
