use remote_server::server::service::graphql::build_schema;
use std::fs;
//  Entry point for export_graphql target, see cargo.toml and reademe.md test section
fn main() {
    let schema = build_schema().finish();
    fs::write("tests/graphql/schema.graphql", &schema.sdl()).unwrap();
}
