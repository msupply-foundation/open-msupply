use graphql::schema_builder;
use std::fs;
//  Entry point for export_graphql target, see cargo.toml and reademe.md test section
fn main() {
    let schema = schema_builder().finish();
    fs::write("graphql/graphql_schema/schema.graphql", &schema.sdl()).unwrap();
}
