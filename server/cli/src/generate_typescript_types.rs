use anyhow::Result;
use repository::{PluginDataFilter, PluginDataRow, StorePreferenceRow};
use service::backend_plugin::types::{amc, graphql_query, transform_request_requisition_lines};
use std::process::Command;
use ts_rs::TS;

#[derive(TS)]
#[allow(unused)]
struct Function<I: TS, O: TS> {
    input: I,
    output: O,
}

#[derive(TS)]
#[allow(unused)]
struct PluginTypes {
    // Fields here must match PluginTypes in backend_plugin_row repository
    average_monthly_consumption: Function<amc::Input, amc::Output>,
    transform_request_requisition_lines: Function<
        transform_request_requisition_lines::Input,
        transform_request_requisition_lines::Output,
    >,
    graphql_query: Function<graphql_query::Input, graphql_query::Output>,
    // Extra types to expose, not directly related to plugin interface
    // like for input or output of global methods
    get_store_preferences: StorePreferenceRow,
    get_plugin_data: Function<PluginDataFilter, Vec<PluginDataRow>>,
}

pub fn generate_typescript_types() -> Result<()> {
    println!("Running test to generate TypeScript types...");
    let generate_result = Command::new("cargo")
        .args([
            "test",
            "--package",
            "cli",
            "export_plugin_typescript",
            "--",
            "--ignored",
            "--nocapture",
        ])
        .status()
        .map_err(|e| anyhow::anyhow!("Failed to run test: {}", e))?;

    if !generate_result.success() {
        return Err(anyhow::anyhow!("TypeScript type generation failed"));
    }

    println!("TypeScript types generation completed successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore]
    fn export_plugin_typescript() {
        PluginTypes::export_all_to("../../client/packages/plugins/backendTypes/generated").unwrap();
    }
}
