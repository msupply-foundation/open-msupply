use std::{env, env::VarError};

pub const APP_ENVIRONMENT_KEY: &str = "APP_ENVIRONMENT";
pub const APP_ENVIRONMENT_LOCAL: &str = "local";
pub const APP_ENVIRONMENT_PRODUCTION: &str = "production";

pub trait EnvironmentVariable {
    fn get() -> String;
    fn try_get() -> Result<String, VarError>;
}

pub struct AppEnvironment;

impl EnvironmentVariable for AppEnvironment {
    fn get() -> String {
        match env::var(APP_ENVIRONMENT_KEY) {
            Ok(v) if v.eq_ignore_ascii_case(APP_ENVIRONMENT_PRODUCTION) => v,
            _ => String::from(APP_ENVIRONMENT_LOCAL),
        }
    }

    fn try_get() -> Result<String, VarError> {
        match env::var(APP_ENVIRONMENT_KEY)? {
            v if v.eq_ignore_ascii_case(APP_ENVIRONMENT_PRODUCTION) => Ok(v),
            _ => Ok(String::from(APP_ENVIRONMENT_LOCAL)),
        }
    }
}
