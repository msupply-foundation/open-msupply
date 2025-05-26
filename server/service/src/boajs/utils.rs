use boa_engine::{js_string, Context, JsError, JsValue};
use serde::de::DeserializeOwned;
use std::error::Error as StandardError;
use std::{future::Future, string::FromUtf16Error, sync::Arc};
use thiserror::Error;
use tokio::runtime::{Handle, RuntimeFlavor};
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
    JsError::from_opaque(js_string!(format_error(&error)).into())
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

/// Executes an async function in a blocking manner from within an async or sync context.
/// Required to run async code, like GraphQL queries, from boa js sync context.
/// Functionality here allows for two examples, one for actix_web server and one for main runtime.
/// Can be seen in action in open-msupply-plugins repository, through graphql query and message processor
pub fn do_async_blocking<T, F>(handle: Arc<Handle>, f: F) -> T
where
    F: Future<Output = T> + Send + 'static,
    T: Send + 'static,
{
    // Typically block_in_place together with block_on should work, and it should actually work as if the method
    // calling do_async_blocking is async (as long as it is called from async context, even if it's not awaited)
    // https://docs.rs/tokio/latest/tokio/task/fn.block_in_place.html#examples
    // However actix_web server does not support block_in_place, even if 'main' runtime is multi-threaded
    // https://docs.rs/actix-web/latest/actix_web/rt/index.html#fnref1:~:text=Crates%20that%20use,with%20Actix%20Web
    if matches!(
        tokio::runtime::Handle::try_current().map(|h| h.runtime_flavor()),
        Ok(RuntimeFlavor::MultiThread)
    ) {
        return tokio::task::block_in_place(move || handle.block_on(f));
    }

    // I found that this works well to run async code in actix_web, but this does not work in main runtime (freezes)
    // it does not work if we try "tokio::runtime::Handle::try_current()" here, handle must be provided from main thread
    let (tx, rx) = std::sync::mpsc::channel();

    handle.spawn(async move {
        println!("working");
        let result = f.await;
        let _ = tx.send(result);
    });

    rx.recv().unwrap()
}
