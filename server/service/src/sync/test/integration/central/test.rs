#[cfg(test)]
mod tests {
    use crate::sync::test::integration::central::{
        master_list::MasterListTester,
        name_and_store_and_name_store_join::NameAndStoreAndNameStoreJoinTester,
        report::ReportTester, test_central_sync_record, unit_and_item::UnitAndItemTester,
    };

    #[actix_rt::test]
    async fn integration_sync_central_unit_and_item() {
        test_central_sync_record("unit_and_item", &UnitAndItemTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_name_and_store_and_name_store_join() {
        test_central_sync_record("name_store_and_join", &NameAndStoreAndNameStoreJoinTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_master_list() {
        test_central_sync_record("master_list", &MasterListTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_report() {
        test_central_sync_record("report", &ReportTester).await;
    }
}
