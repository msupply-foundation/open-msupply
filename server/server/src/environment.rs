use std::{env, env::VarError};

pub const APP_ENVIRONMENT_KEY: &str = "APP_ENVIRONMENT";
pub const APP_ENVIRONMENT_LOCAL: &str = "local";

pub trait EnvironmentVariable {
    fn get() -> String;
    fn try_get() -> Result<String, VarError>;
}

pub struct AppEnvironment;

impl EnvironmentVariable for AppEnvironment {
    fn get() -> String {
        // Allow for environments other than local and production but default to local if the variable isn't set or is invalid
        env::var(APP_ENVIRONMENT_KEY).unwrap_or_else(|_| String::from(APP_ENVIRONMENT_LOCAL))
    }

    fn try_get() -> Result<String, VarError> {
        // Allow for environments other than local and production
        env::var(APP_ENVIRONMENT_KEY)
    }
}
