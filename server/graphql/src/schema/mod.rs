pub mod mutations;
pub mod queries;
pub mod subscriptions;
pub mod types;

pub use mutations::Mutations;
pub use queries::Queries;
use service::permission_validation::ValidationDeniedKind;
pub use subscriptions::Subscriptions;

pub type Schema = async_graphql::Schema<Queries, Mutations, Subscriptions>;

pub fn validation_denied_kind_to_string(kind: ValidationDeniedKind) -> String {
    match kind {
        ValidationDeniedKind::NotAuthenticated(msg) => format!("Not authenticated: {}", msg),
        ValidationDeniedKind::InsufficientPermission((msg, _)) => {
            format!("Insufficient permission: {}", msg)
        }
    }
}
