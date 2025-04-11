#[cfg(test)]
mod tests {
    use crate::sync::test::integration::omsupply_central::{
        asset::AssetTester,
        plugin_data::{PluginDataCentral, PluginDataRemote},
        test_omsupply_central_records, test_omsupply_central_remote_records,
        vaccine_card::test_vaccine_card,
    };

    #[actix_rt::test]
    async fn integration_sync_omsupply_central_sync_plugin_data() {
        test_omsupply_central_records("plugin_data_central", &PluginDataCentral).await;
    }

    #[actix_rt::test]
    async fn integration_sync_omsupply_remote_sync_plugin_data() {
        test_omsupply_central_remote_records("plugin_data_remote", &PluginDataRemote).await;
    }

    #[actix_rt::test]
    async fn integration_sync_omsupply_remote_sync_asset() {
        test_omsupply_central_remote_records("asset", &AssetTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_omsupply_vaccine_card() {
        test_vaccine_card().await;
    }
}
