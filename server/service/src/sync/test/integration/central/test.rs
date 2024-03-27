#[cfg(test)]
mod tests {
    use crate::sync::test::integration::central::{
        currency::CurrencyTester, document_registry::DocumentRegistryTester,
        form_schema::FormSchemaTester,
        inventory_adjustment_reason::InventoryAdjustmentReasonTester,
        master_list::MasterListTester,
        name_and_store_and_name_store_join::NameAndStoreAndNameStoreJoinTester,
        period_schedule_and_period::PeriodScheduleAndPeriodTester, report::ReportTester,
        test_central_sync_record, unit_and_item::UnitAndItemTester,
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

    #[actix_rt::test]
    async fn integration_sync_central_inventory_adjustment_reason() {
        test_central_sync_record(
            "inventory_adjustment_reason",
            &InventoryAdjustmentReasonTester,
        )
        .await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_period_schedule_and_period() {
        test_central_sync_record("period_schedule_and_period", &PeriodScheduleAndPeriodTester)
            .await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_barcode() {
        test_central_sync_record("barcode", &ReportTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_form_schema() {
        test_central_sync_record("form_schema", &FormSchemaTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_document_registry() {
        test_central_sync_record("document_registry", &DocumentRegistryTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_central_currency() {
        test_central_sync_record("currency", &CurrencyTester).await;
    }
}
