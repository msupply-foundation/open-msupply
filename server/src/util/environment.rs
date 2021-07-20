use std::str::FromStr;

pub static LOCAL: &str = "local";
pub static PRODUCTION: &str = "production";

pub enum Environment {
    Local,
    Production,
}

impl Environment {
    pub fn as_str(&self) -> &'static str {
        match self {
            Environment::Local => LOCAL,
            Environment::Production => PRODUCTION,
        }
    }
}

impl FromStr for Environment {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.eq_ignore_ascii_case(LOCAL) {
            Ok(Self::Local)
        } else if s.eq_ignore_ascii_case(PRODUCTION) {
            Ok(Self::Production)
        } else {
            Err(format!(
                "{} is not a supported environment. Use either `{}` or `{}`.",
                s, LOCAL, PRODUCTION
            ))
        }
    }
}
