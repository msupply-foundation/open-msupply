use std::{
    fmt::{Debug, Display, Formatter, Result as FmtResult},
    str::FromStr,
};

pub static LOCAL: &str = "local";
pub static PRODUCTION: &str = "production";

pub enum Environment {
    Local,
    Production,
}

#[derive(Debug)]
pub struct EnvironmentError(String);

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Local => LOCAL,
            Environment::Production => PRODUCTION,
        }
    }
}

impl Display for EnvironmentError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        write!(f, "{}", self.0)
    }
}

impl FromStr for Environment {
    type Err = EnvironmentError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.eq_ignore_ascii_case(LOCAL) {
            Ok(Self::Local)
        } else if s.eq_ignore_ascii_case(PRODUCTION) {
            Ok(Self::Production)
        } else {
            Err(EnvironmentError(format!(
                "{} is not a supported environment. Use either `{}` or `{}`.",
                s, LOCAL, PRODUCTION
            )))
        }
    }
}
