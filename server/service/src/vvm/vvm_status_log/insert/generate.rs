use chrono::Utc;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use crate::service_provider::ServiceContext;

use super::InsertVVMStatusLogInput;

pub fn generate(
    ctx: &ServiceContext,
    InsertVVMStatusLogInput {
        id,
        status_id,
        stock_line_id,
        comment,
        invoice_line_id,
    }: InsertVVMStatusLogInput,
) -> VVMStatusLogRow {
    let now = Utc::now().naive_utc();
    let user_id = ctx.user_id.clone();

    VVMStatusLogRow {
        id,
        status_id,
        datetime: Some(now),
        stock_line_id,
        comment,
        user_id: user_id,
        invoice_line_id,
    }
}
