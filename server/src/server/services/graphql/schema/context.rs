//! src/services/graphql/context.rs

use crate::database::DatabaseConnection;

impl juniper::Context for DatabaseConnection {}
