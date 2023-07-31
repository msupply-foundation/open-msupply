use glob::glob;
use std::fs;
use std::path::Path;

fn main() {
    // when migrations are changing mark the template DBs to be recreated
    for entry in glob("../**/test_output").expect("Failed to read glob pattern") {
        match entry {
            Ok(path) => {
                fs::File::create(Path::new(&path).join("___template_needs_update.marker")).unwrap();
            }
            Err(e) => println!("cargo:warning={:?}", e),
        }
    }
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=src/migrations");
    println!("cargo:rerun-if-changed=src/mock");
}
