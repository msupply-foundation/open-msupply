use glob::glob;
use std::fs;
use std::path::Path;

#[path = "src/test_db/constants.rs"]
mod constants;
use crate::constants::{TEMPLATE_MARKER_FILE, TEST_OUTPUT_DIR};

fn main() {
    // when migrations are changing mark the template DBs to be recreated
    // Only search in specific directories, in particular avoiding ../target/ which has temporary files that may cause glob to error
    let patterns = [
        format!("../{TEST_OUTPUT_DIR}"),
        format!("../repository/**/{TEST_OUTPUT_DIR}"),
        format!("../cli/**/{TEST_OUTPUT_DIR}"),
        format!("../graphql/**/{TEST_OUTPUT_DIR}"),
        format!("../service/**/{TEST_OUTPUT_DIR}"),
    ];

    for pattern in patterns {
        for entry in glob(&pattern).expect("Failed to read glob pattern") {
            match entry {
                Ok(path) => {
                    fs::File::create(Path::new(&path).join(TEMPLATE_MARKER_FILE)).unwrap();
                }
                Err(e) => println!("cargo:warning={:?}", e),
            }
        }
    }

    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=src/migrations");
    println!("cargo:rerun-if-changed=src/mock");
}
