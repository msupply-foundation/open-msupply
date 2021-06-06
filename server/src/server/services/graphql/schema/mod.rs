//! src/services/graphql/mod.rs

mod mutations;
mod queries;
mod subscriptions;
mod types;

pub use mutations::*;
pub use queries::*;
pub use subscriptions::*;
pub use types::*;

pub type Schema = juniper::RootNode<'static, Queries, Mutations, Subscriptions>;
