use uuid::Uuid;

/// Generates unique id
pub fn uuid() -> String {
    Uuid::now_v7().to_string()
}

pub fn small_uuid() -> String {
    uuid().split('-').next().unwrap().to_string()
}
