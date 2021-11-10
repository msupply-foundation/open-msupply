use graphql::build_schema;
use std::fs;
//  Entry point for export_graphql target, see cargo.toml and reademe.md test section
fn main() {
    let schema = build_schema().finish();
    fs::write("graphql/graphql_schema/schema.graphql", &schema.sdl()).unwrap();
}
