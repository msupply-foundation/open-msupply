// where_clauses_object_safety is a future compatibility lint over a soundness issue which is
// hitting a false positive in anymap, which we get notified of and it’s annoying.
// See https://github.com/rust-lang/rust/issues/51443#issuecomment-421988013. They’re unlikely to
// make any change here until such false positives are resolved—it’s OK to break compatibility for
// soundness issues, but the current lint and proposed behaviour change (from 2018, mind you, with
// basically no action taken since) isn’t precise enough.
#![allow(where_clauses_object_safety)]

#[macro_use]
extern crate diesel;

pub mod database;
pub mod server;
pub mod util;
