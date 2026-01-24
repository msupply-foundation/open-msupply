use std::fs;
use std::path::Path;

#[path = "src/test_db/constants.rs"]
mod constants;
use crate::constants::{
    TEMPLATE_MARKER_FILE_POSTGRES, TEMPLATE_MARKER_FILE_SQLITE, TEST_OUTPUT_DIR,
};

fn main() {
    let markers_path = format!("../repository/{TEST_OUTPUT_DIR}");
    fs::create_dir_all(&markers_path).ok();

    fs::File::create(Path::new(&markers_path).join(TEMPLATE_MARKER_FILE_SQLITE)).unwrap();
    fs::File::create(Path::new(&markers_path).join(TEMPLATE_MARKER_FILE_POSTGRES)).unwrap();

    // Removed cargo:rerun-if-changed directives to ensure marker files are always created on every build
    println!("cargo:rerun-if-changed=/migrations");
    // println!("cargo:rerun-if-changed=src/migrations");
    // println!("cargo:rerun-if-changed=src/mock");
}
