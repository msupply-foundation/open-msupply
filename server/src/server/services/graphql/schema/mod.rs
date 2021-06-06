//! src/services/graphql/mod.rs

mod mutations;
mod queries;
mod subscriptions;
mod types;

pub use self::mutations::*;
pub use self::queries::*;
pub use self::subscriptions::*;
pub use self::types::*;

pub type Schema = juniper::RootNode<'static, Queries, Mutations, Subscriptions>;
