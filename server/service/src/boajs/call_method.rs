use std::{
    cell::RefCell,
    collections::HashMap,
    hash::{Hash, Hasher},
    mem::ManuallyDrop,
    path::Path,
    rc::Rc,
    time::Instant,
};

use boa_engine::{
    builtins::promise::PromiseState, js_string, module::SimpleModuleLoader, Context, JsError,
    JsObject, JsValue, Module, Source,
};

use log::debug;
use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

use crate::boajs::utils::NullError;

use super::methods;

// NB: BoaJsError must stay `Send + Sync` so callers like `PluginError` are `Send` and can cross
// the `spawn_blocking` boundary in `call_plugin_async`. boa's `JsError` is `!Send` (it holds
// `Gc`/`Rc`), so we capture it as a formatted string rather than storing it directly.
#[derive(Error, Debug)]
pub enum BoaJsError {
    #[error("Javascript error: {0}")]
    JsError(String),
    #[error("Failed to load JS module")]
    LoadingModule,
    #[error("Failed to locate export {0}")]
    ExportMissing(String),
    #[error(transparent)]
    SerdeError(#[from] serde_json::Error),
    #[error("Plugin task failed to join: {0}")]
    TaskJoin(String),
}

impl From<JsError> for BoaJsError {
    fn from(error: JsError) -> Self {
        BoaJsError::JsError(error.to_string())
    }
}

impl PartialEq for BoaJsError {
    fn eq(&self, _: &Self) -> bool {
        unimplemented!()
    }
}

/// A built JS engine for one plugin bundle: the boa [`Context`] (with our native
/// methods bound) plus the parsed, evaluated [`Module`].
struct CachedEngine {
    context: Context,
    module: Module,
}

thread_local! {
    // Issue #11943: rebuilding the engine (parse + evaluate, ~315ms for a 111KB
    // bundle) on every call dominated the items list query. boa's Context/Module
    // are !Send, so we cache per thread, keyed by bundle contents.
    //
    // ManuallyDrop: boa's Context panics if dropped during thread-local teardown
    // (its GC thread-local may already be gone), so cached engines are leaked at
    // thread exit rather than dropped — a process-lifetime cache on long-lived
    // worker threads, a small bounded leak on the rare short-lived one.
    static ENGINE_CACHE: RefCell<HashMap<u64, ManuallyDrop<CachedEngine>>> =
        RefCell::new(HashMap::new());
}

fn bundle_key(bundle: &[u8]) -> u64 {
    // Keying by bundle contents means a plugin upgrade (new bundle) naturally
    // gets a fresh engine without any explicit cache invalidation.
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    bundle.hash(&mut hasher);
    hasher.finish()
}

#[cfg(test)]
thread_local! {
    // Counts how many engines this thread has built, so tests can assert that a
    // bundle is parsed/evaluated only once per thread and reused thereafter.
    static BUILD_COUNT: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
}

fn build_engine(bundle: &Vec<u8>) -> Result<CachedEngine, BoaJsError> {
    use BoaJsError as Error;

    #[cfg(test)]
    BUILD_COUNT.with(|count| count.set(count.get() + 1));

    // Initialise context with loader
    let loader = Rc::new(SimpleModuleLoader::new(Path::new("."))?);
    let mut context = Context::builder().module_loader(loader.clone()).build()?;

    // Add plugin code as module
    let module = Module::parse(Source::from_bytes(bundle), None, &mut context)?;
    loader.insert(Path::new("module.mjs").to_path_buf(), module.clone());

    // Wait for module to load
    let promise = module.load_link_evaluate(&mut context);
    context.run_jobs()?;
    match promise.state() {
        PromiseState::Fulfilled(v) if v == JsValue::undefined() => {}
        _ => return Err(Error::LoadingModule),
    }

    // TODO should these be bound as camel case ? Also for inputs and outputs ?
    methods::log::bind_method(&mut context)?;
    methods::sql::bind_method(&mut context)?;
    methods::sql_type::bind_method(&mut context)?;
    methods::get_plugin_data::bind_method(&mut context)?;
    methods::get_store_preferences::bind_method(&mut context)?;
    methods::use_repository::bind_method(&mut context)?;
    methods::use_graphql::bind_method(&mut context)?;
    methods::get_active_stores_on_site::bind_method(&mut context)?;
    methods::fetch::bind_method(&mut context)?;
    methods::enqueue_email::bind_method(&mut context)?;

    Ok(CachedEngine { context, module })
}

pub(crate) fn call_method<I, O>(
    input: I,
    // A path to exported method, plugins export { plugins: { plugin_name }}, thus we look for vec!["plugins", "plugin_name"]
    // reports export { convert_data } thus we look for vec!["convert_data"]
    export_location: Vec<&str>,
    bundle: &Vec<u8>,
) -> Result<O, BoaJsError>
where
    I: Serialize,
    O: DeserializeOwned,
{
    // Issue #11943: timing kept (at debug level) to confirm the engine cache
    // turns the per-call ~315ms setup into a one-off-per-thread cost, and to
    // help future plugin perf work. Silent at the prod Info level.
    let started = Instant::now();
    let key = bundle_key(bundle);

    // Take the engine out of the cache for the duration of the call rather than
    // holding the RefCell borrow across `callable.call`. A plugin can re-enter
    // call_method on the same thread (e.g. a `use_graphql` query that resolves a
    // plugin-backed field) — today that crosses a thread boundary via
    // do_async_blocking, but taking ownership here keeps us panic-free even if a
    // future native method calls a plugin synchronously.
    let (mut engine, cache_hit) = ENGINE_CACHE.with(|cache| {
        let existing = cache.borrow_mut().remove(&key);
        match existing {
            Some(engine) => Ok((ManuallyDrop::into_inner(engine), true)),
            None => build_engine(bundle).map(|engine| (engine, false)),
        }
    })?;
    let setup_elapsed = started.elapsed();

    let result = (|| {
        let context = &mut engine.context;
        let callable =
            find_callable_in_exports(context, engine.module.clone(), export_location.clone())?;

        let input: serde_json::Value = serde_json::to_value(&input)?;
        let js_input = JsValue::from_json(&input, context)?;

        let call_started = Instant::now();
        let js_output = callable.call(&JsValue::undefined(), &[js_input], context)?;
        let call_elapsed = call_started.elapsed();

        let option_output = JsValue::to_json(&js_output, context)?;
        let output = option_output.ok_or(JsError::from(NullError))?;

        debug!(
            "boajs::call_method [{}]: {} setup {}ms, call {}ms, total {}ms (bundle {} bytes)",
            export_location.join("."),
            if cache_hit {
                "cache hit,"
            } else {
                "cache miss (built engine),"
            },
            setup_elapsed.as_millis(),
            call_elapsed.as_millis(),
            started.elapsed().as_millis(),
            bundle.len(),
        );

        Ok::<O, BoaJsError>(serde_json::from_value(output)?)
    })();

    // Return the engine to the cache for reuse. On error it's intentionally
    // dropped so a half-evaluated engine isn't reused.
    if result.is_ok() {
        ENGINE_CACHE.with(|cache| {
            cache.borrow_mut().insert(key, ManuallyDrop::new(engine));
        });
    }

    result
}

/// Drop every engine this thread has cached, freeing the boa `Context`s **while
/// the thread is still alive** (boa's GC thread-locals are intact, so the drop
/// is clean — unlike at thread-local teardown, where it panics).
///
/// Wire this into a thread pool's stop hook (see `plugin_executor`) so plugin
/// threads release their cached engines when reaped instead of leaking them.
/// After this runs the thread-local is empty, so the eventual TLS teardown has
/// nothing to drop.
pub(crate) fn clear_engine_cache() {
    ENGINE_CACHE.with(|cache| {
        for (_key, engine) in cache.borrow_mut().drain() {
            // into_inner pulls the engine out of ManuallyDrop so it actually
            // drops here, on this live thread, rather than being leaked.
            drop(ManuallyDrop::into_inner(engine));
        }
    });
}

fn find_callable_in_exports(
    context: &mut Context,
    module: Module,
    export_location: Vec<&str>,
) -> Result<JsObject, BoaJsError> {
    let mut path = module.namespace(context);

    for name in export_location.iter() {
        path = path
            .get(js_string!(*name), context)?
            .as_object()
            .ok_or(BoaJsError::ExportMissing(name.to_string()))?;
    }

    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Minimal ES module bundle exporting `plugins.double`, matching the
    // `vec!["plugins", "<method>"]` export shape real backend plugins use. No
    // native methods are called, so it runs without a bound BoaJsContext.
    fn test_bundle() -> Vec<u8> {
        b"export const plugins = { double: (x) => x * 2 };".to_vec()
    }

    // Within a single thread, the engine is built once and reused for every
    // subsequent call (issue #11943 — previously every call rebuilt it).
    #[test]
    fn engine_is_built_once_per_thread() {
        let bundle = test_bundle();

        let first: f64 = call_method(3.0, vec!["plugins", "double"], &bundle).unwrap();
        let second: f64 = call_method(21.0, vec!["plugins", "double"], &bundle).unwrap();
        let third: f64 = call_method(100.0, vec!["plugins", "double"], &bundle).unwrap();

        assert_eq!(first, 6.0);
        assert_eq!(second, 42.0);
        assert_eq!(third, 200.0);

        // Three calls, but the bundle was parsed/evaluated only once.
        assert_eq!(BUILD_COUNT.with(|count| count.get()), 1);
    }

    // The cache is keyed by bundle contents, so a different bundle (e.g. a
    // plugin upgrade) gets its own engine rather than reusing a stale one.
    #[test]
    fn different_bundles_get_separate_engines() {
        let double = b"export const plugins = { f: (x) => x * 2 };".to_vec();
        let triple = b"export const plugins = { f: (x) => x * 3 };".to_vec();

        let a: f64 = call_method(5.0, vec!["plugins", "f"], &double).unwrap();
        let b: f64 = call_method(5.0, vec!["plugins", "f"], &triple).unwrap();
        // Re-call the first bundle to confirm its engine is still cached/correct.
        let c: f64 = call_method(5.0, vec!["plugins", "f"], &double).unwrap();

        assert_eq!(a, 10.0);
        assert_eq!(b, 15.0);
        assert_eq!(c, 10.0);

        // Two distinct bundles => two builds; the re-call reused the cache.
        assert_eq!(BUILD_COUNT.with(|count| count.get()), 2);
    }

    // clear_engine_cache drops cached engines on the (live) calling thread
    // without panicking, and a later call rebuilds — i.e. the cache was actually
    // emptied/freed. This is the mechanism the plugin runtime's on_thread_stop
    // hook relies on to release engines instead of leaking them (#11943).
    #[test]
    fn clear_engine_cache_drops_and_allows_rebuild() {
        let bundle = test_bundle();

        let _: f64 = call_method(2.0, vec!["plugins", "double"], &bundle).unwrap();
        assert_eq!(BUILD_COUNT.with(|count| count.get()), 1);

        // Must not panic: engines drop cleanly because the thread is still alive.
        clear_engine_cache();

        // Cache was emptied, so the next call rebuilds.
        let result: f64 = call_method(2.0, vec!["plugins", "double"], &bundle).unwrap();
        assert_eq!(result, 4.0);
        assert_eq!(BUILD_COUNT.with(|count| count.get()), 2);
    }

    // Each worker thread maintains its own cache: with N threads each calling
    // the same bundle, every thread builds exactly once but still reuses across
    // its own repeated calls. This is the behaviour behind "after enough calls
    // every thread has the plugin cached".
    #[test]
    fn each_thread_builds_its_own_engine_once() {
        let bundle = test_bundle();

        let handles: Vec<_> = (0..4)
            .map(|_| {
                let bundle = bundle.clone();
                std::thread::spawn(move || {
                    let first: f64 = call_method(4.0, vec!["plugins", "double"], &bundle).unwrap();
                    let second: f64 = call_method(9.0, vec!["plugins", "double"], &bundle).unwrap();
                    (first, second, BUILD_COUNT.with(|count| count.get()))
                })
            })
            .collect();

        for handle in handles {
            let (first, second, builds) = handle.join().unwrap();
            assert_eq!(first, 8.0);
            assert_eq!(second, 18.0);
            // Two calls on this thread, but only one build for it.
            assert_eq!(builds, 1);
        }
    }
}
