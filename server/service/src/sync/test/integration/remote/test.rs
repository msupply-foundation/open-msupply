#[cfg(test)]
mod tests {
    use crate::sync::test::integration::remote::{
        activity_log::ActivityLogRecordTester, invoice::InvoiceRecordTester,
        location::LocationRecordTester, location_movement::LocationMovementRecordTester,
        program_requisition::ProgramRequisitionTester, requisition::RequisitionRecordTester,
        stock_line::StockLineRecordTester, stocktake::StocktakeRecordTester,
        test_remote_sync_record,
    };

    #[actix_rt::test]
    async fn integration_sync_remote_location() {
        test_remote_sync_record("location", &LocationRecordTester).await;
    }

    #[actix_rt::test]
    async fn integration_sync_remote_location_movement() {
        test_remote_sync_record("location_movement", &LocationMovementRecordTester).await;
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

    #[actix_rt::test]
    async fn intergration_sync_program_requisition() {
        test_remote_sync_record("program_requisition", &ProgramRequisitionTester).await;
    }
}
