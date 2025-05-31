use boa_engine::{js_string, Context, JsError, JsValue};
use serde::de::DeserializeOwned;
use std::error::Error as StandardError;
use std::thread::JoinHandle;
use std::{future::Future, string::FromUtf16Error};
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

pub(super) struct NullError;
impl From<NullError> for JsError {
    fn from(_: NullError) -> Self {
        JsError::from_opaque(js_string!("Null value encountered").into())
    }
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
    string_to_js_error(&format_error(&error))
}

pub(super) fn string_to_js_error(string: &str) -> JsError {
    JsError::from_opaque(js_string!(string).into())
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

    let mut closure = move || -> Result<Option<D>, GetJsonArgumentError> {
        let arg = args.get(index).ok_or(Error::NoArgumentAtIndex(index))?;

        let value = arg.to_json(context)?;

        Ok(value.map(serde_json::from_value).transpose()?)
    };

    Ok(closure().map_err(std_error_to_js_error)?.ok_or(NullError)?)
}

#[derive(Error, Debug)]
pub enum ExecuteGraphQlError {
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
    #[error("GraphQL error: {0}")]
    Graphql(String),
}

#[async_trait::async_trait]
pub trait ExecuteGraphql: 'static + Send + Sync {
    async fn execute_graphql(
        &self,
        override_user_id: &str,
        query: &str,
        variables: serde_json::Value,
    ) -> Result<serde_json::Value, ExecuteGraphQlError>;
}

// Creates a new thread and runtime to execute async function
pub fn do_async_blocking<T, F>(f: F) -> Result<T, JsError>
where
    F: Future<Output = T> + Send + 'static,
    T: Send + 'static,
{
    // One day our app will be fully async and we wouldn't need this, we will drive
    // boajs event loop and allow async methods: https://github.com/boa-dev/boa/blob/ac9eb4bcf90d7749d0ceb2ff01e8562d95104ff2/examples/src/bin/module_fetch_async.rs
    let handle: JoinHandle<Result<T, std::io::Error>> = std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(async { Ok(f.await) })
    });
    // Even though we are using a new thread, we will still blocking the current thread
    let handle_result = handle
        .join()
        .map_err(|_| string_to_js_error("Failed to join thread"))?;
    let result = handle_result.map_err(std_error_to_js_error)?;
    Ok(result)
}
