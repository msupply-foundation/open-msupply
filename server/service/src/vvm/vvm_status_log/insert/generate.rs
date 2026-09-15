use chrono::Utc;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use super::InsertVVMStatusLogInput;

pub fn generate(
    store_id: &str,
    user_id: &str,
    InsertVVMStatusLogInput {
        id,
        status_id,
        stock_line_id,
        comment,
    }: InsertVVMStatusLogInput,
) -> VVMStatusLogRow {
    let created_datetime = Utc::now().naive_utc();

    VVMStatusLogRow {
        id,
        status_id,
        created_datetime,
        stock_line_id,
        comment,
        created_by: user_id.to_string(),
        invoice_line_id: None,
        store_id: store_id.to_string(),
    }
}
