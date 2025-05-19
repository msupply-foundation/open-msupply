use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

pub fn generate(
    vvm_status_log: VVMStatusLogRow,
    updated_comment: Option<String>,
) -> VVMStatusLogRow {
    VVMStatusLogRow {
        comment: updated_comment.or(vvm_status_log.comment),
        ..vvm_status_log
    }
}
