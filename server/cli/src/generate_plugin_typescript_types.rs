use crate::{run_command_with_error, NPX_COMMAND};
use anyhow::{anyhow, Result};
use log::info;
use service::backend_plugin::types::generate_typescript_types::export_plugin_typescript;
use std::{path::PathBuf, process::Command};

pub fn generate_plugin_typescript_types(path: PathBuf, skip_prettify: bool) -> Result<()> {
    info!("Running test to generate TypeScript types...");

    export_plugin_typescript(path.clone());

    info!("Types generated...");

    if !skip_prettify {
        info!("Formatting with prettier...");

        run_command_with_error(Command::new(NPX_COMMAND).current_dir(path).args([
            "prettier",
            "--write",
            "./**/*.ts",
        ]))
        .map_err(|e| anyhow!("Failed to run prettier: {}", e))?;

        info!("Formatting finished...");
    }

    Ok(())
}
