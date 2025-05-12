use chrono::NaiveDateTime;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use super::InsertVVMStatusLogInput;

pub fn generate(
    store_id: &str,
    current_user_id: &str,
    InsertVVMStatusLogInput {
        id,
        status_id,
        stock_line_id,
        comment,
        user_id,
        date,
        time,
    }: InsertVVMStatusLogInput,
) -> VVMStatusLogRow {
    let user_id = user_id.unwrap_or_else(|| current_user_id.to_string());
    let created_datetime = NaiveDateTime::new(date, time);

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
