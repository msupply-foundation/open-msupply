// To run this test, you'll need to run central server with a data file with at least one sync site, credentials for which need to be
// passed through with enviromental variable (TODO specify which branch)

// SYNC_SITE_PASSWORD="pass" SYNC_SITE_ID="2" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" NEW_SITE_PASSWORD="pass" cargo test sync_integration_test  --features integration_test

// OR in VSCODE settings if using rust analyzer (and Run Tests|Debug actions as inlay hints):
// "rust-analyzer.runnableEnv": { "SYNC_URL": "http://localhost:2048", "SYNC_SITE_NAME": "demo","SYNC_SITE_PASSWORD": "pass", "NEW_SITE_PASSWORD": "pass"}
// "rust-analyzer.cargo.features": ["integration_test"]

#[cfg(test)]
mod tests {
    use crate::sync::test::integration::remote::{
        invoice::InvoiceRecordTester, location::LocationRecordTester, number::NumberRecordTester,
        requisition::RequisitionRecordTester, stock_line::StockLineRecordTester,
        test_remote_sync_record,
    };

    #[actix_rt::test]
    async fn integration_sync_remote_number() {
        test_remote_sync_record("number", &NumberRecordTester).await;
    }

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
        test_remote_sync_record("stocktake", &StockLineRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_invoice() {
        test_remote_sync_record("invoice", &InvoiceRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_requisition() {
        test_remote_sync_record("requisition", &RequisitionRecordTester).await;
    }
}
