//! src/services/graphql/subscriptions.rs

use crate::utils::database::DatabaseConnection;

pub type Subscriptions = juniper::EmptySubscription<DatabaseConnection>;
