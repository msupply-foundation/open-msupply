use std::fs;
use std::path::Path;

#[path = "src/test_db/constants.rs"]
mod constants;
use crate::constants::{
    TEMPLATE_MARKER_FILE_POSTGRES, TEMPLATE_MARKER_FILE_SQLITE, TEST_OUTPUT_DIR,
};

fn main() {
    // Marker files are currently only read from the test_output directory of the repository crate.
    // When the git repository is cloned, this directory does not exist, so we create it here.
    // We crate markers for both SQLite and Postgres templates to ensure both templates are refreshed
    // when this script runs.
    let markers_path = format!("../repository/{TEST_OUTPUT_DIR}");
    fs::create_dir_all(&markers_path).ok();

    fs::File::create(Path::new(&markers_path).join(TEMPLATE_MARKER_FILE_SQLITE)).unwrap();
    fs::File::create(Path::new(&markers_path).join(TEMPLATE_MARKER_FILE_POSTGRES)).unwrap();

    // A bare `rerun-if-changed=<dir>` only catches add/remove (directory mtime),
    // not edits to existing files — which is what we hit when changing migration code.
    // Walk both trees so every file is tracked individually.
    watch_recursive(Path::new("src/migrations"));
    watch_recursive(Path::new("src/mock"));
}

fn watch_recursive(path: &Path) {
    println!("cargo:rerun-if-changed={}", path.display());
    let Ok(entries) = fs::read_dir(path) else {
        return;
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            watch_recursive(&p);
        } else {
            println!("cargo:rerun-if-changed={}", p.display());
        }
    }
}
