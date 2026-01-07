use crate::run_command_with_error;
use anyhow::{anyhow, Result};
use graphql_core::export_graphql_typescript;
use log::info;
use std::{path::PathBuf, process::Command};

pub fn generate_graphql_typescript_types(path: PathBuf, skip_prettify: bool) -> Result<()> {
    info!("Running test to generate TypeScript types...");

    export_graphql_typescript(path.clone());

    info!("Types generated...");

    if !skip_prettify {
        info!("Formatting with prettier...");

        run_command_with_error(Command::new("npx").current_dir(path).args([
            "prettier",
            "--write",
            "./**/*.ts",
        ]))
        .map_err(|e| anyhow!("Failed to run prettier: {}", e))?;

        info!("Formatting finished...");
    }

    Ok(())
}
