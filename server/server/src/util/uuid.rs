use uuid::Uuid;

/// Generates unique id
pub fn uuid() -> String {
    Uuid::new_v4().to_string()
}
