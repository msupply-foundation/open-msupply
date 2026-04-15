pub mod sync_record;

pub use sync_record::*;

#[derive(Debug, PartialEq)]
pub enum SyncType {
    Remote,
    Central,
    /// Name record has
    Name,
}
