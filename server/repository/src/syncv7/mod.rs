use crate::ChangeLogInsertRowV7;

pub mod global;
pub mod record;
pub mod sync_record;
pub mod translator;
pub mod upsert;

pub use global::*;
pub use record::*;
pub use sync_record::*;
pub use translator::*;
pub use upsert::*;

#[derive(Debug, PartialEq)]
pub enum SyncType {
    Remote,
    Central,
}
