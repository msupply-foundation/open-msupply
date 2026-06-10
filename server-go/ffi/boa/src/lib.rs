//! Leaf FFI wrapper around the Boa JS engine for report `convert_data` transforms.
//!
//! Mirrors the run flow of server/service/src/boajs/call_method.rs, but binds NO host methods
//! (no sql/use_graphql/etc.) and has no global context — it's a pure JSON-in/JSON-out leaf,
//! which is all report convert_data transforms need. Exposed over a C ABI for cgo (WS5).

use std::path::Path;
use std::rc::Rc;
use std::slice;

use boa_engine::{
    builtins::promise::PromiseState, js_string, module::SimpleModuleLoader, Context, JsNativeError,
    JsValue, Module, NativeFunction, Source,
};
use std::os::raw::c_void;

extern "C" {
    fn free(ptr: *mut c_void);
}

/// C callback shape for a host `sql` method (WS5-C, the non-leaf / plugin case): given the
/// query bytes, the callee allocates (C `malloc`) a JSON buffer of result rows into `out`.
/// Rust copies it and frees it. Returns 0 on success.
pub type SqlCallback =
    extern "C" fn(query: *const u8, query_len: usize, out: *mut *mut u8, out_len: *mut usize) -> i32;

/// Parse an ES-module bundle, find `method` in its exports, call it with `input_json`, return
/// the output as JSON bytes. No host methods are bound (pure leaf).
fn run_convert(bundle: &[u8], method: &str, input_json: &[u8]) -> Result<Vec<u8>, String> {
    let loader = Rc::new(SimpleModuleLoader::new(Path::new(".")).map_err(|e| e.to_string())?);
    let context = &mut Context::builder()
        .module_loader(loader.clone())
        .build()
        .map_err(|e| e.to_string())?;

    let module = Module::parse(Source::from_bytes(bundle), None, context).map_err(|e| e.to_string())?;
    loader.insert(Path::new("module.mjs").to_path_buf(), module.clone());

    let promise = module.load_link_evaluate(context);
    context.run_jobs().map_err(|e| e.to_string())?;
    match promise.state() {
        PromiseState::Fulfilled(v) if v == JsValue::undefined() => {}
        other => return Err(format!("module failed to load: {other:?}")),
    }

    // LEAF: deliberately bind no host methods (this is the whole point — reports don't need them).

    let callable = module
        .namespace(context)
        .get(js_string!(method), context)
        .map_err(|e| e.to_string())?
        .as_object()
        .ok_or_else(|| format!("export '{method}' not found or not callable"))?;

    let input: serde_json::Value = serde_json::from_slice(input_json).map_err(|e| e.to_string())?;
    let js_input = JsValue::from_json(&input, context).map_err(|e| e.to_string())?;
    let js_output = callable
        .call(&JsValue::undefined(), &[js_input], context)
        .map_err(|e| e.to_string())?;
    let output = JsValue::to_json(&js_output, context)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "convert returned null/undefined".to_string())?;
    serde_json::to_vec(&output).map_err(|e| e.to_string())
}

/// Like `run_convert`, but binds a `sql(query)` host method that calls BACK into the caller
/// (Go) via `sql_cb`. Demonstrates the bidirectional FFI needed if backend plugins keep
/// running on Boa-in-Rust (the non-leaf case).
fn run_with_sql(
    bundle: &[u8],
    method: &str,
    input_json: &[u8],
    sql_cb: SqlCallback,
) -> Result<Vec<u8>, String> {
    let loader = Rc::new(SimpleModuleLoader::new(Path::new(".")).map_err(|e| e.to_string())?);
    let context = &mut Context::builder()
        .module_loader(loader.clone())
        .build()
        .map_err(|e| e.to_string())?;
    let module = Module::parse(Source::from_bytes(bundle), None, context).map_err(|e| e.to_string())?;
    loader.insert(Path::new("module.mjs").to_path_buf(), module.clone());
    let promise = module.load_link_evaluate(context);
    context.run_jobs().map_err(|e| e.to_string())?;
    match promise.state() {
        PromiseState::Fulfilled(v) if v == JsValue::undefined() => {}
        other => return Err(format!("module failed to load: {other:?}")),
    }

    // Bind the host `sql` method backed by the Go callback (fn pointer is Copy).
    context
        .register_global_callable(
            js_string!("sql"),
            1,
            NativeFunction::from_copy_closure(move |_, args, ctx| {
                let query = args
                    .first()
                    .cloned()
                    .unwrap_or(JsValue::undefined())
                    .to_string(ctx)?
                    .to_std_string_escaped();
                let qb = query.as_bytes();
                let mut out_ptr: *mut u8 = std::ptr::null_mut();
                let mut out_len: usize = 0;
                let rc = sql_cb(qb.as_ptr(), qb.len(), &mut out_ptr, &mut out_len);
                if rc != 0 || out_ptr.is_null() {
                    return Err(JsNativeError::typ().with_message("sql host callback failed").into());
                }
                let bytes = unsafe { slice::from_raw_parts(out_ptr, out_len) }.to_vec();
                unsafe { free(out_ptr as *mut c_void) };
                let value: serde_json::Value = serde_json::from_slice(&bytes)
                    .map_err(|e| JsNativeError::typ().with_message(e.to_string()))?;
                JsValue::from_json(&value, ctx)
            }),
        )
        .map_err(|e| e.to_string())?;

    let callable = module
        .namespace(context)
        .get(js_string!(method), context)
        .map_err(|e| e.to_string())?
        .as_object()
        .ok_or_else(|| format!("export '{method}' not found or not callable"))?;
    let input: serde_json::Value = serde_json::from_slice(input_json).map_err(|e| e.to_string())?;
    let js_input = JsValue::from_json(&input, context).map_err(|e| e.to_string())?;
    let js_output = callable
        .call(&JsValue::undefined(), &[js_input], context)
        .map_err(|e| e.to_string())?;
    let output = JsValue::to_json(&js_output, context)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "convert returned null/undefined".to_string())?;
    serde_json::to_vec(&output).map_err(|e| e.to_string())
}

/// Run a bundle whose JS calls a host `sql()` satisfied by the Go callback `sql_cb`.
///
/// # Safety
/// As [`bjs_run`], plus `sql_cb` must be a valid C function pointer.
#[no_mangle]
pub unsafe extern "C" fn bjs_run_with_sql(
    bundle_ptr: *const u8,
    bundle_len: usize,
    method_ptr: *const u8,
    method_len: usize,
    input_ptr: *const u8,
    input_len: usize,
    sql_cb: SqlCallback,
    out_ptr: *mut *mut u8,
    out_len: *mut usize,
) -> i32 {
    let bundle = slice::from_raw_parts(bundle_ptr, bundle_len);
    let input = slice::from_raw_parts(input_ptr, input_len);
    let method = match std::str::from_utf8(slice::from_raw_parts(method_ptr, method_len)) {
        Ok(s) => s,
        Err(_) => {
            write_out(out_ptr, out_len, b"method is not valid UTF-8".to_vec());
            return 1;
        }
    };
    match run_with_sql(bundle, method, input, sql_cb) {
        Ok(bytes) => {
            write_out(out_ptr, out_len, bytes);
            0
        }
        Err(e) => {
            write_out(out_ptr, out_len, e.into_bytes());
            1
        }
    }
}

/// Hand `bytes` to the caller as an owned buffer; freed with [`bjs_free`].
fn write_out(out_ptr: *mut *mut u8, out_len: *mut usize, bytes: Vec<u8>) {
    let boxed = bytes.into_boxed_slice();
    let len = boxed.len();
    let ptr = Box::into_raw(boxed) as *mut u8;
    unsafe {
        *out_ptr = ptr;
        *out_len = len;
    }
}

/// Run a convert_data bundle. Returns 0 on success (out = output JSON), 1 on error (out =
/// UTF-8 error message). The caller must free `out` via [`bjs_free`].
///
/// # Safety
/// All pointers must be valid for their stated lengths for the duration of the call.
#[no_mangle]
pub unsafe extern "C" fn bjs_run(
    bundle_ptr: *const u8,
    bundle_len: usize,
    method_ptr: *const u8,
    method_len: usize,
    input_ptr: *const u8,
    input_len: usize,
    out_ptr: *mut *mut u8,
    out_len: *mut usize,
) -> i32 {
    let bundle = slice::from_raw_parts(bundle_ptr, bundle_len);
    let input = slice::from_raw_parts(input_ptr, input_len);
    let method = match std::str::from_utf8(slice::from_raw_parts(method_ptr, method_len)) {
        Ok(s) => s,
        Err(_) => {
            write_out(out_ptr, out_len, b"method is not valid UTF-8".to_vec());
            return 1;
        }
    };
    match run_convert(bundle, method, input) {
        Ok(bytes) => {
            write_out(out_ptr, out_len, bytes);
            0
        }
        Err(e) => {
            write_out(out_ptr, out_len, e.into_bytes());
            1
        }
    }
}

/// Free a buffer returned by [`bjs_run`].
///
/// # Safety
/// `ptr`/`len` must come from a prior [`bjs_run`] output.
#[no_mangle]
pub unsafe extern "C" fn bjs_free(ptr: *mut u8, len: usize) {
    if !ptr.is_null() {
        let _ = Box::from_raw(slice::from_raw_parts_mut(ptr, len) as *mut [u8]);
    }
}
