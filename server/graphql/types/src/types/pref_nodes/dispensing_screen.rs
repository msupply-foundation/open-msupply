use async_graphql::Enum;
use service::preference::DispensingScreenOption;

/// Which screen dispensing opens on (the `dispensingScreen` preference).
#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
#[graphql(remote = "DispensingScreenOption")]
pub enum DispensingScreenNode {
    /// The dispensing list
    Standard,
    /// The Simple dispensing screen
    Simple,
}
