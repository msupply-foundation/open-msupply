use graphql::build_schema;
use std::fs;
//  Entry point for export_graphql target, see cargo.toml and reademe.md test section
fn main() {
    // Try to detect if we are in the graphql crate or in the root crate and adjust the output
    // path accordingly.
    let has_schema_dir = fs::read_dir(".").unwrap().find_map(|entry| {
        let dir = entry.unwrap();
        Some(dir.file_type().unwrap().is_dir() && dir.file_name() == "graphql_schema")
    });
    let output_path = if has_schema_dir.unwrap() {
        // assume we are in graphql dir
        "graphql_schema/schema.graphql"
    } else {
        // assume we are in the project root dir
        "graphql/graphql_schema/schema.graphql"
    };

    let schema = build_schema().finish();
    fs::write(output_path, &schema.sdl()).unwrap();
}
