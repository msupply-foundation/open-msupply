use std::string::FromUtf16Error;

use boa_engine::{js_string, JsError, JsValue};
use std::error::Error as StandardError;
use thiserror::Error;
use util::format_error;

#[derive(Debug, Error)]
enum GetStringArgumentError {
    #[error("No argument at index {0}")]
    NoArgumentAtIndex(usize),
    #[error("No argument at index {0} is not a string")]
    ArgumentAtIndexIsNotAString(usize),
    #[error(transparent)]
    FromUtf16Error(#[from] FromUtf16Error),
}

pub(super) fn get_string_argument(args: &[JsValue], index: usize) -> Result<String, JsError> {
    use GetStringArgumentError as Error;

    let closure = move || -> Result<String, GetStringArgumentError> {
        let Some(arg) = args.get(index) else {
            return Err(Error::NoArgumentAtIndex(index));
        };

        let Some(arg) = arg.as_string() else {
            return Err(Error::ArgumentAtIndexIsNotAString(index));
        };

        Ok(arg.to_std_string()?)
    };

    closure().map_err(std_error_to_js_error)
}

pub(super) fn std_error_to_js_error(error: impl StandardError) -> JsError {
    let as_string = JsValue::String(js_string!(format_error(&error)));
    JsError::from_opaque(as_string)
}
