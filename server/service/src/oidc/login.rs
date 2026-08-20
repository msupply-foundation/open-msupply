//! Completing a sign-in: code -> ID token -> local user -> permissions -> session.

use repository::{ActivityLogType, UserAccountRowRepository};

use crate::{
    activity_log::activity_log_entry,
    service_provider::ServiceProvider,
    settings::{OidcAccountSource, OidcPermissionSource},
    user_account::UserAccountService,
};

use super::{
    account::resolve_group_account,
    claims::{groups_from_claim, roles_from_claim, string_claim},
    pending::PendingAuth,
    role_grant::{apply_role_permissions, revoke_role_grants, RoleGrantSummary},
    OidcError, OidcService,
};

/// A completed sign-in. The caller turns this into a session token and cookie, exactly as the
/// password login does — see `graphql_general::queries::login`.
#[derive(Debug, Clone)]
pub struct OidcLoginSuccess {
    pub user_id: String,
    /// The mSupply account the session runs as — the person under `username_claim`, the group's
    /// shared account under `group`.
    pub username: String,
    /// Where to send the browser next, as captured and validated when the flow started.
    pub redirect_after: Option<String>,
    /// What the role mapping did. `None` under `account_source: group`, where there is no mapping
    /// to do: the session is the group's account and carries its own permissions.
    pub role_grants: Option<RoleGrantSummary>,
}

impl OidcService {
    /// Handle the provider's callback: exchange the code, verify the ID token, match the user
    /// against a local account, and apply the permissions their roles grant.
    ///
    /// The caller redeems `state` itself (via [`OidcService::take_pending`]) and hands the result
    /// in, so that it still knows where the sign-in came from if this fails and it needs to route
    /// the user back to the right login page.
    ///
    /// Deliberately does **not** create the session — the caller owns the transport (cookie vs
    /// bearer), which keeps this free of HTTP concerns.
    ///
    /// Takes a [`ServiceProvider`] rather than a `ServiceContext` for the same reason
    /// [`crate::login::LoginService::login`] does: a context holds a thread-bound SQLite
    /// connection and so can't be held across the `await`s below. All database work happens after
    /// the last one.
    pub async fn complete_login(
        &self,
        service_provider: &ServiceProvider,
        code: &str,
        pending: PendingAuth,
    ) -> Result<OidcLoginSuccess, OidcError> {
        let id_token = self.exchange_code(code, &pending.code_verifier).await?;
        let claims = self.verify_id_token(&id_token, &pending.nonce).await?;

        let settings = self.settings();

        // Everything below is synchronous database work.
        let mut ctx = service_provider.basic_context()?;
        let user_service = UserAccountService::new(&ctx.connection);

        // Which mSupply account this session runs as. Neither branch creates one: `user_account`
        // rows and their store joins are owned by mSupply sync, so an identity the provider
        // vouches for but mSupply has never heard of is not a user here (it may simply be that
        // sync hasn't caught up yet — hence the logged detail on the way out).
        let (user_account, signed_in_as) = match settings.account_source {
            OidcAccountSource::UsernameClaim => {
                let username = string_claim(&claims, &settings.username_claim)
                    .ok_or_else(|| OidcError::MissingClaim(settings.username_claim.clone()))?;
                let account = UserAccountRowRepository::new(&ctx.connection)
                    .find_one_by_user_name_unfiltered(&username)?
                    .ok_or_else(|| OidcError::UnknownUser(username.clone()))?;
                (account, username)
            }
            OidcAccountSource::Group => {
                let groups = groups_from_claim(&claims, &settings.group_claim);
                if groups.is_empty() {
                    // By far the likeliest misconfiguration: Keycloak sends no group membership
                    // unless a "Group Membership" mapper is added to the client, so the claim is
                    // simply absent and every sign-in fails the same way. Say so once, here,
                    // rather than leaving an empty list to be interpreted.
                    log::warn!(
                        "OIDC group sign-in: the '{}' claim is absent or empty — is a Group \
                         Membership mapper configured on the Keycloak client?",
                        settings.group_claim
                    );
                }
                let account = resolve_group_account(
                    &ctx.connection,
                    &groups,
                    settings.role_template_prefix.as_deref(),
                )?;
                // The person is not an mSupply identity in this mode, so the only place their name
                // is recorded is the log line below. Best effort: the username claim if the realm
                // sends one, else the token's subject.
                let who = string_claim(&claims, &settings.username_claim)
                    .or_else(|| string_claim(&claims, "sub"))
                    .unwrap_or_else(|| "unknown".to_string());
                log::info!(
                    "OIDC group sign-in: '{who}' is in {groups:?}, seated as mSupply account '{}'",
                    account.username
                );
                (account, who)
            }
        };
        let username = user_account.username.clone();

        if !user_account.is_active {
            return Err(OidcError::AccountInactive(username));
        }

        // No password check and no password requirement: the provider authenticated the user, and
        // an SSO-only account may hold no mSupply password at all.
        let user = user_service
            .find_user_on_this_site(&user_account.id)?
            .ok_or(OidcError::NoSiteAccess)?;
        let store_ids: Vec<String> = user
            .stores
            .iter()
            .map(|store| store.store_row.id.clone())
            .collect();

        // Whether the provider's roles decide permissions at all. They do not when the deployment
        // has said the account's own mSupply permissions are the whole story, and they cannot under
        // `group`, where the session already *is* the group's account.
        let role_grants = match settings.maps_roles_to_permissions() {
            true => {
                let roles = roles_from_claim(&claims, &settings.roles_claim);
                if roles.is_empty() {
                    // Keycloak's built-in *realm roles* mapper populates the ACCESS token but not
                    // the ID token, which is what is verified here — so a realm with roles
                    // correctly assigned still arrives with nothing. Same class of trap as the
                    // groups claim; say which claim was looked for, since it is configurable.
                    log::warn!(
                        "OIDC sign-in: the '{}' claim is absent or empty — is a roles mapper \
                         adding it to the ID TOKEN (not just the access token)?",
                        settings.roles_claim
                    );
                }
                let grants = apply_role_permissions(
                    &ctx,
                    &user_account.id,
                    &store_ids,
                    &roles,
                    settings.role_template_prefix.as_deref(),
                )
                .map_err(|error| {
                    if matches!(error, OidcError::NoMatchingRole(_)) {
                        // This failure is only reachable in username_claim mode, so it is also the
                        // symptom of `account_source: group` not being in effect — and an
                        // unrecognised config key is dropped silently, which makes that hard to
                        // tell apart from a genuine role-matching problem. Say both out loud.
                        log::warn!(
                            "OIDC role matching failed with account_source = username_claim. If                              you meant group-based sign-in, `oidc.account_source: group` is NOT                              in effect on this server — check the 'Single sign-on enabled' line                              from startup, which names the mode actually in use."
                        );
                    }
                    error
                })?;
                log::info!(
                    "OIDC sign-in for '{username}': roles {:?} matched groups, {:?} did not; {} \
                     permissions granted and {} revoked across {} store(s)",
                    grants.matched_roles,
                    grants.unmatched_roles,
                    grants.granted,
                    grants.revoked,
                    grants.stores.len(),
                );
                Some(grants)
            }
            false => {
                // Any grant left by an earlier sign-in under `permission_source: roles` has to go,
                // or "the account's own permissions" would be a claim this code contradicts.
                let revoked = revoke_role_grants(&ctx, &user_account.id)?;
                log::info!(
                    "OIDC sign-in as '{username}' (for '{signed_in_as}'): the account's own \
                     permissions apply across {} store(s); {revoked} stale role grant(s) removed",
                    store_ids.len(),
                );
                None
            }
        };

        ctx.user_id.clone_from(&user_account.id);
        activity_log_entry(&ctx, ActivityLogType::UserLoggedIn, None, None, None)?;

        Ok(OidcLoginSuccess {
            user_id: user_account.id,
            username,
            redirect_after: pending.redirect_after,
            role_grants,
        })
    }
}
