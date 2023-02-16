#[cfg(test)]
mod tests {
    use crate::sync::test::integration::remote::{
        activity_log::ActivityLogRecordTester, invoice::InvoiceRecordTester,
        location::LocationRecordTester, requisition::RequisitionRecordTester,
        stock_line::StockLineRecordTester, stocktake::StocktakeRecordTester,
        test_remote_sync_record,
    };

    #[actix_rt::test]
    async fn integration_sync_remote_location() {
        test_remote_sync_record("location", &LocationRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_stock_line() {
        test_remote_sync_record("stock_line", &StockLineRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_stocktake() {
        test_remote_sync_record("stocktake", &StocktakeRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_invoice() {
        test_remote_sync_record("invoice", &InvoiceRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_requisition() {
        test_remote_sync_record("requisition", &RequisitionRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_activity_log() {
        test_remote_sync_record("om_activity_log", &ActivityLogRecordTester).await;
    }
}
