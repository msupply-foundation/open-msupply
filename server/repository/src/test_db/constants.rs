use std::{path::PathBuf, str::FromStr};

#[allow(dead_code)]
pub(crate) const TEST_OUTPUT_DIR: &str = "test_output";
#[cfg(all(not(feature = "postgres"), not(feature = "memory")))]
#[allow(dead_code)]
pub(crate) const TEMPLATE_MARKER_FILE: &str = "___template_needs_update.marker";
#[cfg(feature = "postgres")]
pub(crate) const TEMPLATE_MARKER_FILE: &str = "___template_needs_update_pg.marker";

#[allow(dead_code)]
pub(crate) const ENV_MSUPPLY_NO_TEST_DB_TEMPLATE: &'static str = "MSUPPLY_NO_TEST_DB_TEMPLATE";

#[allow(dead_code)]
pub(crate) fn env_msupply_no_test_db_template() -> bool {
    let Ok(var) = std::env::var(ENV_MSUPPLY_NO_TEST_DB_TEMPLATE) else {
        return false;
    };
    match var.as_str() {
        "true" | "1" => true,
        "false" | "0" => false,
        _ => panic!("Invalid MSUPPLY_NO_TEST_DB_TEMPLATE env value: {}", var),
    }
}

#[allow(dead_code)]
pub(crate) fn find_workspace_root() -> PathBuf {
    let mut path = PathBuf::from_str(env!("CARGO_MANIFEST_DIR")).unwrap();
    while let Some(current) = path.parent() {
        path = current.to_path_buf();
        if path.join("Cargo.lock").exists() {
            return path;
        }
    }
    panic!("workspace root not found!");
}
