use crate::run_command_with_error;
use anyhow::{anyhow, Result};
use log::info;
use std::process::Command;

pub fn generate_typescript_types() -> Result<()> {
    info!("Running test to generate TypeScript types...");

    run_command_with_error(Command::new("cargo").args([
        "test",
        "--package",
        "service",
        "backend_plugin::types::generate_typescript_types::export_plugin_types",
        "--",
        "--ignored",
        "--nocapture",
    ]))
    .map_err(|e| anyhow!("Failed to run test: {}", e))?;

    info!("Test completed successfully, generating TypeScript types...");

    // Assuming you are running the command from the server directory
    run_command_with_error(Command::new("npx").current_dir("../client").args([
        "prettier",
        "--write",
        "packages/plugins/backendCommon/generated/**/*.ts",
    ]))
    .map_err(|e| anyhow!("Failed to run prettier: {}", e))?;

    info!("TypeScript types generation completed successfully");
    Ok(())
}
