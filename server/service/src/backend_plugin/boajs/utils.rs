use std::string::FromUtf16Error;

use boa_engine::{js_string, Context, JsError, JsValue};
use serde::de::DeserializeOwned;
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
        let arg = args.get(index).ok_or(Error::NoArgumentAtIndex(index))?;

        let arg = arg
            .as_string()
            .ok_or(Error::ArgumentAtIndexIsNotAString(index))?;

        Ok(arg.to_std_string()?)
    };

    closure().map_err(std_error_to_js_error)
}

pub(super) fn std_error_to_js_error(error: impl StandardError) -> JsError {
    let as_string = JsValue::String(js_string!(format_error(&error)));
    JsError::from_opaque(as_string)
}

#[derive(Debug, Error)]
enum GetJsonArgumentError {
    #[error("No argument at index {0}")]
    NoArgumentAtIndex(usize),
    #[error(transparent)]
    JsError(#[from] JsError),
    #[error(transparent)]
    SerdeError(#[from] serde_json::Error),
}

pub(super) fn get_serde_argument<D: DeserializeOwned>(
    context: &mut Context,
    args: &[JsValue],
    index: usize,
) -> Result<D, JsError> {
    use GetJsonArgumentError as Error;

    let mut closure = move || -> Result<D, GetJsonArgumentError> {
        let arg = args.get(index).ok_or(Error::NoArgumentAtIndex(index))?;

        let value = arg.to_json(context)?;

        Ok(serde_json::from_value(value)?)
    };

    closure().map_err(std_error_to_js_error)
}
