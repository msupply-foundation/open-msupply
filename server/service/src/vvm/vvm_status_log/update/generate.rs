use chrono::Utc;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use super::UpdateVVMStatusLogInput;

pub fn generate(
    store_id: &str,
    user_id: &str,
    vvm_status_log: VVMStatusLogRow,
    UpdateVVMStatusLogInput {
        id,
        status_id,
        comment,
    }: UpdateVVMStatusLogInput,
) -> VVMStatusLogRow {
    let created_datetime = Utc::now().naive_utc();

    let comment = if let Some(comment) = comment {
        Some(comment)
    } else {
        vvm_status_log.comment
    };

    VVMStatusLogRow {
        id,
        status_id: status_id.unwrap_or(vvm_status_log.status_id),
        created_datetime,
        stock_line_id: vvm_status_log.stock_line_id,
        comment,
        created_by: user_id.to_string(),
        invoice_line_id: None,
        store_id: store_id.to_string(),
    }
}
