pub mod amc;
pub mod graphql_query;
pub mod transform_request_requisition_lines;

pub mod generate_typescript_types {
    use std::path::PathBuf;

    use super::*;
    use repository::{PluginDataFilter, PluginDataRow, StorePreferenceRow};
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
    // Runs in CLI
    pub fn export_plugin_typescript(path: PathBuf) {
        PluginTypes::export_all_to(path).unwrap();
    }
}
