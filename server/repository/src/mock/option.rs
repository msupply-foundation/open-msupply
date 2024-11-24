use util::inline_init;

use crate::reason_option_row::{ReasonOptionRow, ReasonOptionType};

pub fn mock_option() -> ReasonOptionRow {
    inline_init(|r: &mut ReasonOptionRow| {
        r.id = "option_id".to_string();
        r.r#type = ReasonOptionType::ReturnReason;
        r.is_active = true;
        r.reason = "reason".to_string();
    })
}

pub fn mock_options() -> Vec<ReasonOptionRow> {
    vec![mock_option()]
}
