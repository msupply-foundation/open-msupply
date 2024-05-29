pub mod canonical_json;
pub mod constants;
pub mod hash;
pub mod timezone;
pub mod uuid;

mod logger;

use std::env;

pub use logger::*;

mod inline_init;
pub use inline_init::*;

mod number_operations;
pub use number_operations::*;

mod date_operations;
pub use date_operations::*;

mod test_helpers;

mod json;
pub use json::*;

mod error;
pub use error::*;

mod file;
pub use file::*;

pub fn is_central_server() -> bool {
    env::var("IS_CENTRAL_SERVER")
        .map(|is_central_server| is_central_server.to_lowercase() == "true")
        .unwrap_or(false)
}

// TODO:?
pub fn central_server_url() -> String {
    env::var("CENTRAL_SERVER_URL").unwrap_or("".to_string())
}
