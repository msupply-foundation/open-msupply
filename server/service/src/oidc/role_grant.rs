//! Turning identity-provider roles into mSupply permissions.
//!
//! A role names a **permission group**: an mSupply user account whose permissions describe what
//! that role may do. The group account is synchronised from mSupply like any other user, so the
//! permission set is authored and maintained in mSupply — nothing here is configured on the site.
//!
//! For each role the user presents, the group account is looked up, its permission *types* are
//! collected, and those are granted to the user in every store the user already has access to.
//! Two boundaries keep a group from widening access beyond what mSupply granted:
//!
//! * `StoreAccess` is never copied, and grants only land in stores where the user already has it,
//!   so a group can add capabilities inside a store but can't hand out a new store.
//! * The group's own store scoping is deliberately dropped — the group answers *what*, the user's
//!   store joins answer *where*.
//!
//! Grants are rewritten on every sign-in and are recognisable by their id
//! ([`UserPermissionRow::is_role_grant`]), so a role that is taken away in Keycloak loses its
//! permissions on the user's next sign-in, and permissions delivered by sync are never touched.
//! They are also written without a changelog entry: central stays the sole author of the
//! permissions it distributes.

use std::collections::HashSet;

use repository::{
    EqualFilter, PermissionType, UserAccountRowRepository, UserPermissionFilter,
    UserPermissionRepository, UserPermissionRow, UserPermissionRowRepository,
};

use crate::service_provider::ServiceContext;

use super::OidcError;

/// Outcome of a role mapping. Logged on every sign-in so an operator can see which role produced
/// which permissions without turning on debug logging.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RoleGrantSummary {
    /// Roles that resolved to a permission group.
    pub matched_roles: Vec<String>,
    /// Roles with no corresponding group account. Not an error on its own — realms hand out roles
    /// like `offline_access` that have nothing to do with mSupply — as long as one role matched.
    pub unmatched_roles: Vec<String>,
    /// Stores the grants were written for.
    pub stores: Vec<String>,
    pub granted: usize,
    /// Grants from a previous sign-in that no longer apply and were removed.
    pub revoked: usize,
}

/// Account name a role takes its permissions from, e.g. role `dispensary` with prefix `role_`
/// resolves to the account `role_dispensary`.
pub fn group_username(role: &str, prefix: Option<&str>) -> String {
    format!("{}{}", prefix.unwrap_or(""), role.trim())
}

/// Remove every role grant this site minted for a user, leaving only what mSupply gave them.
///
/// Run on each sign-in under [`crate::settings::OidcPermissionSource::Account`], so that switching
/// a deployment to it actually takes effect: grants written by earlier sign-ins under `Roles` would
/// otherwise linger and keep granting permissions with nothing left to explain them.
///
/// Only rows this site minted are touched — recognised by their id
/// ([`UserPermissionRow::is_role_grant`]) — so permissions delivered by sync are untouched, and
/// nothing is queued for sync.
pub fn revoke_role_grants(ctx: &ServiceContext, user_id: &str) -> Result<usize, OidcError> {
    ctx.connection
        .transaction_sync(|connection| {
            let existing = UserPermissionRepository::new(connection).query_by_filter(
                UserPermissionFilter::new().user_id(EqualFilter::equal_to(user_id.to_string())),
            )?;
            let repo = UserPermissionRowRepository::new(connection);

            let mut revoked = 0;
            for row in existing.iter().filter(|row| row.is_role_grant()) {
                repo.delete_without_changelog(&row.id)?;
                revoked += 1;
            }
            Ok::<usize, OidcError>(revoked)
        })
        .map_err(|error| error.to_inner_error())
}

/// Grant the permissions of the user's roles, and drop grants that no longer apply.
///
/// `store_ids` are the stores the user is joined to on this site.
pub fn apply_role_permissions(
    ctx: &ServiceContext,
    user_id: &str,
    store_ids: &[String],
    roles: &[String],
    role_group_prefix: Option<&str>,
) -> Result<RoleGrantSummary, OidcError> {
    ctx.connection
        .transaction_sync(|connection| {
            let account_repo = UserAccountRowRepository::new(connection);
            let permission_repo = UserPermissionRepository::new(connection);
            let permission_row_repo = UserPermissionRowRepository::new(connection);

            // 1. Resolve each role to the group account it takes permissions from.
            let mut matched_roles = Vec::new();
            let mut unmatched_roles = Vec::new();
            let mut group_ids = Vec::new();
            for role in roles {
                let username = group_username(role, role_group_prefix);
                match account_repo.find_one_by_user_name(&username)? {
                    Some(account) if account.id == user_id => {
                        // A group resolving to the user signing in would make their own
                        // permissions their group — circular, and it means a role named after
                        // someone's username silently grants whatever they already have.
                        log::warn!(
                            "OIDC role '{role}' resolves to the signing-in user's own account \
                             ({username}); ignoring it as a permission group"
                        );
                        unmatched_roles.push(role.clone());
                    }
                    Some(account) if !account.is_active => {
                        log::warn!(
                            "OIDC role '{role}' resolves to inactive account {username}; \
                             ignoring it as a permission group"
                        );
                        unmatched_roles.push(role.clone());
                    }
                    Some(account) => {
                        matched_roles.push(role.clone());
                        group_ids.push(account.id);
                    }
                    None => unmatched_roles.push(role.clone()),
                }
            }

            if matched_roles.is_empty() {
                return Err(OidcError::NoMatchingRole(roles.to_vec()));
            }

            // 2. Union of the groups' permissions. Store scoping is dropped here on purpose: the
            //    group says what, the user's store joins say where.
            let mut group_permissions: Vec<(PermissionType, Option<String>)> = Vec::new();
            for group_id in &group_ids {
                let group_rows = permission_repo.query_by_filter(
                    UserPermissionFilter::new().user_id(EqualFilter::equal_to(group_id.clone())),
                )?;
                for row in group_rows {
                    // The per-store master switch stays the user's own: a group must not be able
                    // to open a store the user isn't allowed into.
                    if row.permission == PermissionType::StoreAccess {
                        continue;
                    }
                    let permission = (row.permission, row.context_id);
                    if !group_permissions.contains(&permission) {
                        group_permissions.push(permission);
                    }
                }
            }

            // 3. Restrict to stores the user can already log into.
            let existing = permission_repo.query_by_filter(
                UserPermissionFilter::new().user_id(EqualFilter::equal_to(user_id.to_string())),
            )?;
            let stores_with_access: HashSet<&str> = existing
                .iter()
                .filter(|row| row.permission == PermissionType::StoreAccess)
                .filter_map(|row| row.store_id.as_deref())
                .collect();
            let stores: Vec<String> = store_ids
                .iter()
                .filter(|store_id| stores_with_access.contains(store_id.as_str()))
                .cloned()
                .collect();
            if stores.is_empty() {
                return Err(OidcError::NoSiteAccess);
            }

            // 4. Reconcile: write the grants that should exist, remove the ones that shouldn't.
            //
            // A permission the user already holds from sync in that store needs no grant — it would
            // be a second row saying the same thing, which shows up as a duplicate wherever
            // permissions are listed. (If sync later takes it away, the next sign-in adds the
            // grant; if sync later adds one a grant already covers, the grant is revoked below.)
            let already_held: HashSet<(&str, &PermissionType, Option<&str>)> = existing
                .iter()
                .filter(|row| !row.is_role_grant())
                .filter_map(|row| {
                    Some((
                        row.store_id.as_deref()?,
                        &row.permission,
                        row.context_id.as_deref(),
                    ))
                })
                .collect();

            let desired: Vec<UserPermissionRow> = stores
                .iter()
                .flat_map(|store_id| {
                    group_permissions
                        .iter()
                        .map(move |(permission, context_id)| (store_id, permission, context_id))
                })
                .filter(|(store_id, permission, context_id)| {
                    !already_held.contains(&(store_id.as_str(), permission, context_id.as_deref()))
                })
                .map(|(store_id, permission, context_id)| UserPermissionRow {
                    id: UserPermissionRow::role_grant_id(
                        user_id,
                        Some(store_id),
                        permission,
                        context_id.as_deref(),
                    ),
                    user_id: user_id.to_string(),
                    store_id: Some(store_id.clone()),
                    permission: permission.clone(),
                    context_id: context_id.clone(),
                })
                .collect();
            let desired_ids: HashSet<&str> = desired.iter().map(|row| row.id.as_str()).collect();

            let mut revoked = 0;
            for row in &existing {
                if row.is_role_grant() && !desired_ids.contains(row.id.as_str()) {
                    permission_row_repo.delete_without_changelog(&row.id)?;
                    revoked += 1;
                }
            }
            for row in &desired {
                permission_row_repo.upsert_one_without_changelog(row)?;
            }

            Ok(RoleGrantSummary {
                matched_roles,
                unmatched_roles,
                stores,
                granted: desired.len(),
                revoked,
            })
        })
        .map_err(|error| error.to_inner_error())
}

#[cfg(test)]
mod tests {
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{mock_store_a, mock_store_b, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        ChangelogRepository, PermissionType, UserAccountRow, UserPermissionRow,
        UserPermissionRowRepository, UserStoreJoinRow,
    };

    use super::*;

    const USER: &str = "oidc_user";
    const DISPENSARY_GROUP: &str = "group_dispensary";
    const STOCK_GROUP: &str = "group_stock";

    fn account(id: &str, username: &str) -> UserAccountRow {
        UserAccountRow {
            id: id.to_string(),
            username: username.to_string(),
            hashed_password: "hash".to_string(),
            ..UserAccountRow::default()
        }
    }

    fn permission(
        id: &str,
        user_id: &str,
        store_id: &str,
        permission: PermissionType,
    ) -> UserPermissionRow {
        UserPermissionRow {
            id: id.to_string(),
            user_id: user_id.to_string(),
            store_id: Some(store_id.to_string()),
            permission,
            context_id: None,
        }
    }

    fn store_join(id: &str, user_id: &str, store_id: &str) -> UserStoreJoinRow {
        UserStoreJoinRow {
            id: id.to_string(),
            user_id: user_id.to_string(),
            store_id: store_id.to_string(),
            is_default: false,
        }
    }

    /// User joined to store_a and store_b (with StoreAccess in both), plus two permission groups:
    /// `role_dispensary` (PrescriptionMutate, and DocumentQuery in a program context) and
    /// `role_stock` (StocktakeMutate). The groups' own permissions sit in store_a only, to prove
    /// the group's store scoping is not what decides where grants land.
    fn test_data() -> MockData {
        MockData {
            user_accounts: vec![
                account(USER, "jane"),
                account(DISPENSARY_GROUP, "role_dispensary"),
                account(STOCK_GROUP, "role_stock"),
            ],
            user_store_joins: vec![
                store_join("join_a", USER, &mock_store_a().id),
                store_join("join_b", USER, &mock_store_b().id),
            ],
            user_permissions: vec![
                permission(
                    "access_a",
                    USER,
                    &mock_store_a().id,
                    PermissionType::StoreAccess,
                ),
                permission(
                    "access_b",
                    USER,
                    &mock_store_b().id,
                    PermissionType::StoreAccess,
                ),
                permission(
                    "dispensary_1",
                    DISPENSARY_GROUP,
                    &mock_store_a().id,
                    PermissionType::PrescriptionMutate,
                ),
                UserPermissionRow {
                    context_id: Some("program_a".to_string()),
                    ..permission(
                        "dispensary_2",
                        DISPENSARY_GROUP,
                        &mock_store_a().id,
                        PermissionType::DocumentQuery,
                    )
                },
                // Groups carry StoreAccess like any user; it must not be copied.
                permission(
                    "dispensary_access",
                    DISPENSARY_GROUP,
                    &mock_store_a().id,
                    PermissionType::StoreAccess,
                ),
                permission(
                    "stock_1",
                    STOCK_GROUP,
                    &mock_store_a().id,
                    PermissionType::StocktakeMutate,
                ),
            ],
            ..MockData::default()
        }
    }

    async fn setup(test_name: &str) -> ServiceContext {
        let (_, _, connection_manager, _) = setup_all_with_data(
            test_name,
            MockDataInserts::none()
                .names()
                .stores()
                // `program_a`, referenced by the context-bound permission below.
                .contexts()
                .user_accounts()
                .user_store_joins()
                .user_permissions(),
            test_data(),
        )
        .await;
        ServiceProvider::new(connection_manager)
            .basic_context()
            .unwrap()
    }

    fn grants(
        ctx: &ServiceContext,
        user_id: &str,
    ) -> Vec<(String, PermissionType, Option<String>)> {
        let mut rows = UserPermissionRepository::new(&ctx.connection)
            .query_by_filter(
                UserPermissionFilter::new().user_id(EqualFilter::equal_to(user_id.to_string())),
            )
            .unwrap()
            .into_iter()
            .filter(|row| row.is_role_grant())
            .map(|row| {
                (
                    row.store_id.clone().unwrap_or_default(),
                    row.permission.clone(),
                    row.context_id.clone(),
                )
            })
            .collect::<Vec<_>>();
        rows.sort_by(|a, b| format!("{a:?}").cmp(&format!("{b:?}")));
        rows
    }

    #[actix_rt::test]
    async fn grants_group_permissions_across_the_users_stores() {
        let ctx = setup("oidc_grants_group_permissions").await;

        let summary = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id, mock_store_b().id],
            &["dispensary".to_string(), "offline_access".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(summary.matched_roles, vec!["dispensary".to_string()]);
        assert_eq!(summary.unmatched_roles, vec!["offline_access".to_string()]);
        // Two permissions x two stores; StoreAccess not copied.
        assert_eq!(summary.granted, 4);
        assert_eq!(summary.revoked, 0);

        assert_eq!(
            grants(&ctx, USER),
            vec![
                (
                    mock_store_a().id,
                    PermissionType::DocumentQuery,
                    Some("program_a".to_string())
                ),
                (mock_store_a().id, PermissionType::PrescriptionMutate, None),
                (
                    mock_store_b().id,
                    PermissionType::DocumentQuery,
                    Some("program_a".to_string())
                ),
                (mock_store_b().id, PermissionType::PrescriptionMutate, None),
            ]
        );
    }

    #[actix_rt::test]
    async fn several_roles_are_unioned() {
        let ctx = setup("oidc_unions_roles").await;

        let summary = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["dispensary".to_string(), "stock".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(summary.matched_roles.len(), 2);
        assert_eq!(summary.granted, 3);
        assert!(grants(&ctx, USER)
            .iter()
            .any(|(_, permission, _)| *permission == PermissionType::StocktakeMutate));
    }

    #[actix_rt::test]
    async fn losing_a_role_revokes_its_grants_but_not_synced_permissions() {
        let ctx = setup("oidc_revokes_stale_grants").await;

        apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["dispensary".to_string(), "stock".to_string()],
            Some("role_"),
        )
        .unwrap();

        // Signing in again with only one of the two roles.
        let summary = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["stock".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(
            summary.revoked, 2,
            "the dispensary grants should be dropped"
        );
        assert_eq!(
            grants(&ctx, USER),
            vec![(mock_store_a().id, PermissionType::StocktakeMutate, None)]
        );
        // The StoreAccess rows that came from sync are untouched.
        assert!(UserPermissionRowRepository::new(&ctx.connection)
            .find_one_by_id("access_a")
            .unwrap()
            .is_some());
        assert!(UserPermissionRowRepository::new(&ctx.connection)
            .find_one_by_id("access_b")
            .unwrap()
            .is_some());
    }

    #[actix_rt::test]
    async fn grants_are_idempotent() {
        let ctx = setup("oidc_grants_idempotent").await;

        let first = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["dispensary".to_string()],
            Some("role_"),
        )
        .unwrap();
        let second = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["dispensary".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(first, second);
        assert_eq!(second.revoked, 0);
        assert_eq!(grants(&ctx, USER).len(), 2);
    }

    #[actix_rt::test]
    async fn no_matching_group_is_an_error() {
        let ctx = setup("oidc_no_matching_group").await;

        let result = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["offline_access".to_string()],
            Some("role_"),
        );

        assert!(matches!(result, Err(OidcError::NoMatchingRole(_))));
        assert!(grants(&ctx, USER).is_empty());
    }

    #[actix_rt::test]
    async fn prefix_is_required_to_match() {
        let ctx = setup("oidc_prefix_required").await;

        // With no prefix configured, 'dispensary' must not resolve to 'role_dispensary'.
        assert!(matches!(
            apply_role_permissions(
                &ctx,
                USER,
                &[mock_store_a().id],
                &["dispensary".to_string()],
                None,
            ),
            Err(OidcError::NoMatchingRole(_))
        ));

        // ...but the full account name does, for deployments that don't namespace groups.
        assert!(apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["role_dispensary".to_string()],
            None,
        )
        .is_ok());
    }

    #[actix_rt::test]
    async fn a_group_cannot_add_a_store_the_user_has_no_access_to() {
        let ctx = setup("oidc_store_access_required").await;

        // program_master_list_store is not one of the user's stores at all.
        let summary = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id, "program_master_list_store".to_string()],
            &["dispensary".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(summary.stores, vec![mock_store_a().id]);
        assert!(grants(&ctx, USER)
            .iter()
            .all(|(store_id, _, _)| *store_id == mock_store_a().id));
    }

    #[actix_rt::test]
    async fn a_role_naming_the_users_own_account_is_ignored() {
        let ctx = setup("oidc_self_referential_role").await;

        let result = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["jane".to_string()],
            None,
        );

        assert!(matches!(result, Err(OidcError::NoMatchingRole(_))));
    }

    #[actix_rt::test]
    async fn a_permission_the_user_already_has_from_sync_is_not_duplicated() {
        let ctx = setup("oidc_no_duplicate_grants").await;

        // The user already holds PrescriptionMutate in store_a from sync, so only the group's other
        // permission needs granting there — but both are still granted in store_b.
        UserPermissionRowRepository::new(&ctx.connection)
            .upsert_one(&permission(
                "synced_prescription",
                USER,
                &mock_store_a().id,
                PermissionType::PrescriptionMutate,
            ))
            .unwrap();

        let summary = apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id, mock_store_b().id],
            &["dispensary".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(summary.granted, 3);
        assert_eq!(
            grants(&ctx, USER),
            vec![
                (
                    mock_store_a().id,
                    PermissionType::DocumentQuery,
                    Some("program_a".to_string())
                ),
                (
                    mock_store_b().id,
                    PermissionType::DocumentQuery,
                    Some("program_a".to_string())
                ),
                (mock_store_b().id, PermissionType::PrescriptionMutate, None),
            ]
        );
    }

    #[actix_rt::test]
    async fn revoking_leaves_only_what_msupply_granted() {
        // Switching a deployment to `permission_source: account` has to actually take effect: the
        // grants an earlier `roles` sign-in wrote would otherwise keep applying with nothing left
        // to explain them.
        let ctx = setup("oidc_revoke_role_grants").await;

        apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id, mock_store_b().id],
            &["dispensary".to_string(), "stock".to_string()],
            Some("role_"),
        )
        .unwrap();
        assert!(!grants(&ctx, USER).is_empty());

        let revoked = revoke_role_grants(&ctx, USER).unwrap();

        assert_eq!(revoked, 6);
        assert!(grants(&ctx, USER).is_empty());
        // The StoreAccess rows sync delivered are untouched — they are what the account keeps.
        for id in ["access_a", "access_b"] {
            assert!(
                UserPermissionRowRepository::new(&ctx.connection)
                    .find_one_by_id(id)
                    .unwrap()
                    .is_some(),
                "{id} came from sync and must survive"
            );
        }
    }

    #[actix_rt::test]
    async fn revoking_is_a_no_op_when_there_is_nothing_to_revoke() {
        let ctx = setup("oidc_revoke_nothing").await;

        assert_eq!(revoke_role_grants(&ctx, USER).unwrap(), 0);
    }

    #[actix_rt::test]
    async fn revoking_is_never_queued_for_sync() {
        let ctx = setup("oidc_revoke_not_synced").await;
        apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["dispensary".to_string()],
            Some("role_"),
        )
        .unwrap();
        let changelog_repo = ChangelogRepository::new(&ctx.connection);
        let mark = changelog_repo.max_cursor().unwrap();

        revoke_role_grants(&ctx, USER).unwrap();

        assert_eq!(changelog_repo.max_cursor().unwrap(), mark);
    }

    #[actix_rt::test]
    async fn grants_are_never_queued_for_sync() {
        let ctx = setup("oidc_grants_not_synced").await;
        let changelog_repo = ChangelogRepository::new(&ctx.connection);
        let mark = changelog_repo.max_cursor().unwrap();

        // A sign-in that grants, followed by one that revokes.
        apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["dispensary".to_string(), "stock".to_string()],
            Some("role_"),
        )
        .unwrap();
        apply_role_permissions(
            &ctx,
            USER,
            &[mock_store_a().id],
            &["stock".to_string()],
            Some("role_"),
        )
        .unwrap();

        assert_eq!(
            changelog_repo.max_cursor().unwrap(),
            mark,
            "locally derived grants must not be pushed to central"
        );
    }
}
