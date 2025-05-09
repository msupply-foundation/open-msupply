use chrono::Utc;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use super::InsertVVMStatusLogInput;

pub struct GenerateInput {
    pub user_id: String,
    pub store_id: String,
    pub insert_input: InsertVVMStatusLogInput,
}

pub fn generate(
    GenerateInput {
        user_id,
        store_id,
        insert_input,
    }: GenerateInput,
) -> VVMStatusLogRow {
    let InsertVVMStatusLogInput {
        id,
        status_id,
        stock_line_id,
        comment,
        invoice_line_id,
    } = insert_input;

    let now = Utc::now().naive_utc();

    VVMStatusLogRow {
        id,
        status_id,
        created_datetime: now,
        stock_line_id,
        comment,
        created_by: user_id,
        invoice_line_id,
        store_id,
    }
}
