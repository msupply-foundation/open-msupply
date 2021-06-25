pub mod context;
pub mod mutations;
pub mod queries;
pub mod subscriptions;
pub mod types;

pub use mutations::Mutations;
pub use queries::Queries;
pub use subscriptions::Subscriptions;

pub type Schema = juniper::RootNode<'static, Queries, Mutations, Subscriptions>;
