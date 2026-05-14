pub use uuid::Uuid;

/// Generates unique id
pub fn uuid() -> String {
    Uuid::now_v7().to_string()
}

pub fn small_uuid() -> String {
    uuid().split('-').next().unwrap().to_string()
}

/// Stable UUID v5 derived from `name` under `namespace`. Same input always produces
/// the same UUID — use for IDs that must be reproducible across sites so the same
/// logical row computes to the same id wherever it's created.
pub fn deterministic_uuid(namespace: &Uuid, name: &str) -> String {
    Uuid::new_v5(namespace, name.as_bytes()).to_string()
}
