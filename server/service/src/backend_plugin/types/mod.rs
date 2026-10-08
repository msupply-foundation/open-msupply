pub mod amc;
pub mod get_consumption;
pub mod graphql_query;
pub mod processor;
pub mod schedule;
pub mod transform_request_requisition_lines;

pub mod generate_typescript_types {
    use crate::{
        boajs::methods::{
            enqueue_email::{EnqueueEmailInput, EnqueueEmailOutput},
            fetch::{FetchInput, FetchOutput},
            use_graphql::UseGraphqlInput,
            use_repository::{UseRepositoryInput, UseRepositoryOutput},
        },
        sync::ActiveStoresOnSite,
    };
    use std::path::PathBuf;

    use super::*;
    use repository::{PluginDataFilter, PluginDataRow, StorePreferenceRow};
    use ts_rs::{Config, TS};

    #[derive(TS)]
    #[allow(unused)]
    struct Function<I: TS, O: TS> {
        input: I,
        output: O,
    }

    /// The backend-plugin type surface, and the source of truth for it.
    ///
    /// `remote_server_cli generate-plugin-typescript-types` turns this struct
    /// into the TypeScript that backend plugins compile against, committed at
    /// `client/packages/plugins/backendCommon/generated/` (59 files, each
    /// carrying a ts-rs "do not edit" header).
    ///
    /// That command is run BY HAND. Nothing in CI regenerates those files or
    /// diffs them against this struct, so a type changed here without a rerun
    /// leaves the two silently out of step — and the drift is invisible until
    /// a plugin happens to touch the part that moved.
    ///
    /// So: change anything reachable from here, regenerate, and commit the
    /// result in the same change. `frontend/plugins/civ/backend` resolves
    /// `@common/*` to that directory (`frontend/tsconfig.backend-plugins.json`),
    /// which makes `pnpm check` in `frontend/` the thing most likely to catch
    /// a mismatch — but only for the surface that plugin actually uses.
    #[derive(TS)]
    #[allow(unused)]
    struct PluginTypes {
        // Fields here must match PluginTypes in backend_plugin_row repository
        average_monthly_consumption: Function<amc::Input, amc::Output>,
        transform_request_requisition_lines: Function<
            transform_request_requisition_lines::Input,
            transform_request_requisition_lines::Output,
        >,
        get_consumption: Function<get_consumption::Input, get_consumption::Output>,
        graphql_query: Function<graphql_query::Input, graphql_query::Output>,
        processor: Function<processor::Input, processor::Output>,
        schedule: Function<schedule::Input, schedule::Output>,
        // Extra types to expose, not directly related to plugin interface
        // like for input or output of global methods
        get_store_preferences: StorePreferenceRow,
        get_plugin_data: Function<PluginDataFilter, Vec<PluginDataRow>>,
        use_repository: Function<UseRepositoryInput, UseRepositoryOutput>,
        use_graphql: Function<UseGraphqlInput, serde_json::Value>,
        get_active_stores_on_site: Function<(), ActiveStoresOnSite>,
        fetch: Function<FetchInput, FetchOutput>,
        enqueue_email: Function<EnqueueEmailInput, EnqueueEmailOutput>,
    }
    // Runs in CLI: `remote_server_cli generate-plugin-typescript-types`, which
    // needs no arguments — `--path` already defaults to
    // ../client/packages/plugins/backendCommon/generated — and prettifies the
    // output afterwards unless `--skip-prettify` is passed. See PluginTypes
    // above for when you are obliged to run it.
    pub fn export_plugin_typescript(path: PathBuf) {
        PluginTypes::export_all(&Config::new().with_out_dir(path)).unwrap();
    }
}
