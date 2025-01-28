use chrono::{FixedOffset, Local};

pub fn offset_to_timezone(timezone_offset: &Option<i32>) -> Option<FixedOffset> {
    match timezone_offset {
        None => Some(*Local::now().offset()),
        Some(offset) => FixedOffset::east_opt(offset * 60 * 60),
    }
}
