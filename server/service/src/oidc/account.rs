//! Resolving the mSupply `user_account` an SSO session runs as.
//!
//! Two shapes, chosen by [`crate::settings::OidcAccountSource`]:
//!
//! * **`username_claim`** — the person's own account. They must already exist in mSupply;
//!   permissions then come from their roles ([`super::role_grant`]).
//! * **`group`** — the account named by their group, shared by everyone in it. The provider's users
//!   need not exist in mSupply at all, and no permissions are granted: the session *is* that
//!   account, so it carries exactly what mSupply gave it.
//!
//! Neither creates anything. `user_account` rows and their store joins are owned by mSupply sync,
//! and an identity the provider vouches for but mSupply has never heard of is not a user here.

use repository::{UserAccountRow, UserAccountRowRepository};

use super::OidcError;

/// The account a group name maps to, with the configured prefix applied: group `dispensary` with
/// prefix `role_` resolves to the account `role_dispensary`.
pub fn group_account_name(group: &str, prefix: Option<&str>) -> String {
    format!("{}{}", prefix.unwrap_or(""), group.trim())
}

/// Resolve the one account the user's groups name.
///
/// Groups that match no account are ignored — a realm hands out groups for all sorts of reasons,
/// and only the ones a deployment has mapped to mSupply mean anything here.
///
/// **Exactly one** must match. None is a sign-in this server can't seat; more than one is a
/// deployment that has mapped one person to two mSupply identities, and picking between them
/// arbitrarily would make *which user did this* a coin toss. Both refuse, and the log names what
/// was tried.
pub fn resolve_group_account(
    connection: &repository::StorageConnection,
    groups: &[String],
    prefix: Option<&str>,
) -> Result<UserAccountRow, OidcError> {
    let repo = UserAccountRowRepository::new(connection);

    let mut matched: Vec<UserAccountRow> = Vec::new();
    let mut tried: Vec<String> = Vec::new();
    for group in groups {
        let account_name = group_account_name(group, prefix);
        tried.push(account_name.clone());
        let Some(account) = repo.find_one_by_user_name_unfiltered(&account_name)? else {
            continue;
        };
        // Two group paths can normalise to one name, and two names could in principle reach the
        // same row; the same account twice is one match, not an ambiguity.
        if !matched.iter().any(|found| found.id == account.id) {
            matched.push(account);
        }
    }

    match matched.len() {
        0 => {
            // The account names, not just the groups — that is what an operator compares against
            // `user_account.username`, and the prefix is easy to get wrong in exactly one place.
            log::warn!(
                "OIDC group sign-in: no mSupply user account named any of {tried:?} \
                 (from groups {groups:?})"
            );
            Err(OidcError::UnknownGroupAccount(groups.to_vec()))
        }
        1 => Ok(matched.remove(0)),
        _ => Err(OidcError::AmbiguousGroupAccount(
            matched
                .into_iter()
                .map(|account| account.username)
                .collect(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use repository::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        StorageConnection, UserAccountRow,
    };
    use util::assert_matches;

    use super::*;

    fn account(id: &str, username: &str) -> UserAccountRow {
        UserAccountRow {
            id: id.to_string(),
            username: username.to_string(),
            hashed_password: "hash".to_string(),
            ..UserAccountRow::default()
        }
    }

    /// Two group accounts, plus a real person's account that shares a name with a plausible group
    /// — the case `role_template_prefix` exists to keep out of reach.
    async fn setup(test_name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all_with_data(
            test_name,
            MockDataInserts::none().names().stores().user_accounts(),
            MockData {
                user_accounts: vec![
                    account("group_dispensary", "role_dispensary"),
                    account("group_stock", "role_stock"),
                    account("person_admin", "dispensary"),
                    account(
                        "group_inactive",
                        // Inactive is *not* filtered here — login reports it distinctly.
                        "role_retired",
                    ),
                ],
                ..MockData::default()
            },
        )
        .await;
        connection
    }

    #[actix_rt::test]
    async fn resolves_the_group_to_its_account() {
        let connection = setup("oidc_group_account_resolves").await;

        let account =
            resolve_group_account(&connection, &["dispensary".to_string()], Some("role_")).unwrap();

        assert_eq!(account.id, "group_dispensary");
    }

    #[actix_rt::test]
    async fn ignores_groups_that_map_to_nothing() {
        let connection = setup("oidc_group_account_ignores_unmapped").await;

        // A realm hands out plenty of groups that mean nothing to mSupply.
        let account = resolve_group_account(
            &connection,
            &[
                "everyone".to_string(),
                "dispensary".to_string(),
                "offline_access".to_string(),
            ],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(account.id, "group_dispensary");
    }

    #[actix_rt::test]
    async fn refuses_when_no_group_maps_to_an_account() {
        let connection = setup("oidc_group_account_none").await;

        assert_matches!(
            resolve_group_account(&connection, &["everyone".to_string()], Some("role_")),
            Err(OidcError::UnknownGroupAccount(_))
        );
    }

    #[actix_rt::test]
    async fn refuses_a_user_with_no_groups_at_all() {
        let connection = setup("oidc_group_account_empty").await;

        // What a missing Group Membership mapper looks like from here.
        assert_matches!(
            resolve_group_account(&connection, &[], Some("role_")),
            Err(OidcError::UnknownGroupAccount(_))
        );
    }

    #[actix_rt::test]
    async fn refuses_two_groups_naming_two_accounts() {
        let connection = setup("oidc_group_account_ambiguous").await;

        // Which user did this? Not a question to answer by picking one.
        assert_matches!(
            resolve_group_account(
                &connection,
                &["dispensary".to_string(), "stock".to_string()],
                Some("role_")
            ),
            Err(OidcError::AmbiguousGroupAccount(_))
        );
    }

    #[actix_rt::test]
    async fn the_prefix_keeps_a_persons_account_out_of_reach() {
        let connection = setup("oidc_group_account_prefix").await;

        // 'dispensary' is a real person's username here. With the prefix set, a group of that name
        // reaches the group account, never the person.
        let with_prefix =
            resolve_group_account(&connection, &["dispensary".to_string()], Some("role_")).unwrap();
        assert_eq!(with_prefix.id, "group_dispensary");

        // Without one, it does reach the person — which is exactly why the prefix is recommended.
        let without_prefix =
            resolve_group_account(&connection, &["dispensary".to_string()], None).unwrap();
        assert_eq!(without_prefix.id, "person_admin");
    }

    #[actix_rt::test]
    async fn matching_is_case_insensitive() {
        let connection = setup("oidc_group_account_case").await;

        let account =
            resolve_group_account(&connection, &["DISPENSARY".to_string()], Some("role_")).unwrap();

        assert_eq!(account.id, "group_dispensary");
    }
}
