//! src/utils/environment.rs

use std::str::FromStr;

pub enum Environment {
    Local,
    Production,
}

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Local => "local",
            Environment::Production => "production",
        }
    }
}

impl FromStr for Environment {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.eq_ignore_ascii_case("local") {
            Ok(Self::Local)
        } else if s.eq_ignore_ascii_case("production") {
            Ok(Self::Production)
        } else {
            Err(format!(
                "{} is not a supported environment. Use either `local` or `production`.",
                s
            ))
        }
    }
}
