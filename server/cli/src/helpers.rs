use std::process::{Command, ExitStatus, Stdio};

use thiserror::Error;

#[derive(Error, Debug)]
pub enum CommandError {
    #[error(transparent)]
    FailedToRunCommand(#[from] std::io::Error),
    #[error("Exited with non ok status {0}")]
    StatusNotOk(ExitStatus),
}

pub fn run_command_with_error(command: &mut Command) -> Result<(), CommandError> {
    let status = command
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()?;

    if status.success() {
        return Ok(());
    }
    return Err(CommandError::StatusNotOk(status));
}
