use std::{
    collections::HashMap,
    fmt::{Display, Formatter, Result},
};

use repository::{
    database_settings::DatabaseSettings,
    migrations::{
        ChangelogPartitionConfig, DEFAULT_CHANGELOG_LOOKAHEAD, DEFAULT_CHANGELOG_PARTITION_SIZE,
    },
};
use serde::{Deserialize, Serialize};

use crate::sync::settings::SyncSettings;

#[derive(Deserialize, Serialize, Clone)]
pub struct Settings {
    pub server: ServerSettings,
    pub database: DatabaseSettings,
    pub sync: Option<SyncSettings>,
    pub logging: Option<LoggingSettings>,
    pub backup: Option<BackupSettings>,
    pub mail: Option<MailSettings>,
    pub features: Option<HashMap<String, bool>>,
    pub changelog_partition: Option<ChangelogPartitionSettings>,
    pub changelog_dedup: Option<ChangelogDedupSettings>,
    /// OpenID Connect (Keycloak) single sign-on. Absent disables it, and the password login is
    /// untouched either way. See [`crate::oidc`].
    pub oidc: Option<OidcSettings>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ServerSettings {
    pub port: u16,
    /// Allow to run the server in http mode
    #[serde(default)]
    pub danger_allow_http: bool,
    /// Only used in development mode
    #[serde(default)]
    pub debug_no_access_control: bool,

    #[serde(default)]
    pub discovery: DiscoveryMode,
    /// Sets the allowed origin for cors requests
    pub cors_origins: Vec<String>,
    /// Directory where the server stores its data, e.g. sqlite DB file or certs
    #[serde(default = "default_base_dir")]
    pub base_dir: String,
    /// Option to set the machine id of the device for an OS that isn't supported by machine_uid
    pub machine_uid: Option<String>,
    // Option to set server mode as central server, should only be used in testing, demo and development
    #[serde(default)]
    pub override_is_central_server: bool,

    // Standalone central initialisation; requires `override_is_central_server: true`
    #[serde(default)]
    pub standalone_store_name: Option<String>,
    #[serde(default)]
    pub standalone_admin_username: Option<String>,
    #[serde(default)]
    pub standalone_admin_password: Option<String>,

    /// Number of actix-web worker threads. Defaults to the number of logical CPUs.
    /// Increase if 408 timeouts are observed under load.
    pub workers: Option<usize>,

    /// How long (in seconds) a user may be inactive before the front end forces a re-login.
    /// Advisory: exposed to clients via `UserNode.inactivityTimeoutSeconds`; the server does not
    /// enforce it (server-side session expiry is governed by `SESSION_LIFETIME`).
    #[serde(default = "default_inactivity_timeout_seconds")]
    pub inactivity_timeout_seconds: u32,
    /// If the user is active but no API call has happened for this long (in seconds), the front
    /// end calls the refresh endpoint to keep the session alive. Advisory: exposed to clients via
    /// `UserNode.tokenRefreshIntervalSeconds`.
    #[serde(default = "default_token_refresh_interval_seconds")]
    pub token_refresh_interval_seconds: u32,

    /// Directory the web frontend is served from, resolved relative to the
    /// working directory. Packaging ships the built frontend bundle here;
    /// on Android the app shell copies its bundled web assets here on startup.
    /// An `old-ui` subdirectory, when present, is served under `/old-ui/`
    /// (by convention — not configurable).
    #[serde(default = "default_frontend_dir")]
    pub frontend_dir: String,
}

pub const DEFAULT_INACTIVITY_TIMEOUT_SECONDS: u32 = 900;
pub const DEFAULT_TOKEN_REFRESH_INTERVAL_SECONDS: u32 = 60;

fn default_inactivity_timeout_seconds() -> u32 {
    DEFAULT_INACTIVITY_TIMEOUT_SECONDS
}

fn default_token_refresh_interval_seconds() -> u32 {
    DEFAULT_TOKEN_REFRESH_INTERVAL_SECONDS
}

fn default_base_dir() -> String {
    "app_data".to_string()
}

fn default_frontend_dir() -> String {
    "frontend".to_string()
}

/// Which mSupply `user_account` an SSO session runs as — see [`OidcSettings::account_source`].
#[derive(Deserialize, Serialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OidcAccountSource {
    /// The account named by [`OidcSettings::username_claim`]: one mSupply user per person, and
    /// the person must already exist in mSupply. Permissions are then granted from the roles the
    /// provider returns (see [`crate::oidc::role_grant`]).
    #[default]
    UsernameClaim,
    /// The account named by the user's group ([`OidcSettings::group_claim`]): one mSupply user per
    /// group, shared by everyone in it. The provider's users need not exist in mSupply at all —
    /// only the group accounts do — and no permissions are granted or revoked, because the
    /// session already *is* that account and carries the permissions mSupply gave it.
    ///
    /// The trade is attribution: every action by everyone in a group is recorded against the one
    /// account, so the database cannot tell them apart. Who actually signed in appears only in
    /// the server log.
    Group,
}

/// Where an SSO session's permissions come from — see [`OidcSettings::permission_source`].
#[derive(Deserialize, Serialize, Clone, Copy, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OidcPermissionSource {
    /// The provider's roles are matched to mSupply accounts acting as permission groups, and their
    /// permissions are granted to the user for the stores they can already reach. A user whose
    /// roles match no group is **refused**. See [`crate::oidc::role_grant`].
    #[default]
    Roles,
    /// The signed-in account's own mSupply permissions are the whole story: the provider proves who
    /// the user is and nothing else. Roles are not read, no grants are written, and any left by a
    /// previous sign-in under [`Self::Roles`] are removed so that what mSupply granted is all that
    /// applies.
    Account,
}

/// Configuration for OpenID Connect single sign-on against Keycloak (or any spec-compliant
/// provider). Endpoints are read from the provider's discovery document, so only the issuer is
/// needed here.
///
/// The session always runs as an existing local `user_account` that is active on this site — user
/// accounts and store joins stay owned by mSupply sync, and nothing here creates them. Which
/// account, and where its permissions come from, is [`Self::account_source`].
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct OidcSettings {
    /// Issuer URL, e.g. `https://keycloak.example.org/realms/msupply`. The discovery document is
    /// fetched from `{issuer}/.well-known/openid-configuration` and the `iss` claim of the ID
    /// token must match it exactly.
    pub issuer: String,
    /// Client id registered in the Keycloak realm.
    pub client_id: String,
    /// Only for confidential clients. Public clients authenticate the code exchange with PKCE
    /// alone, which is what Keycloak's default "public" client type expects.
    #[serde(default)]
    pub client_secret: Option<String>,
    /// Absolute URL the provider redirects back to. Must be registered verbatim as a valid
    /// redirect URI on the Keycloak client and must resolve to this server's
    /// `/auth/oidc/callback`, e.g. `https://oms.example.org/auth/oidc/callback`.
    pub redirect_url: String,
    #[serde(default = "default_oidc_scopes")]
    pub scopes: Vec<String>,
    /// Which `user_account` the session runs as: the one named by the person's
    /// [`Self::username_claim`] (the default), or the one named by their
    /// [`Self::group_claim`]. See [`OidcAccountSource`] — the two differ in more than the lookup
    /// key.
    #[serde(default)]
    pub account_source: OidcAccountSource,
    /// ID-token claim holding the name to match against `user_account.username`
    /// (case-insensitive). `preferred_username` is Keycloak's default.
    ///
    /// With `account_source: group` this is no longer the account lookup — it is only used to
    /// name the person in the server log, and may be absent.
    #[serde(default = "default_oidc_username_claim")]
    pub username_claim: String,
    /// Dotted path to the claim holding the user's groups, used only when
    /// [`Self::account_source`] is `group`.
    ///
    /// Keycloak does **not** put group membership in a token by default — add a *Group
    /// Membership* mapper to the client (or a client scope it uses); `groups` is that mapper's
    /// default claim name. Values may be plain names (`dispensary`) or full paths
    /// (`/pharmacy/dispensary`, the mapper's default); either way the **last** path segment is
    /// what is matched, after [`Self::role_template_prefix`].
    #[serde(default = "default_oidc_group_claim")]
    pub group_claim: String,
    /// Where the session's permissions come from. Only meaningful with
    /// `account_source: username_claim` — under `group` the session already *is* the group's
    /// account, so its own permissions always apply. See [`OidcPermissionSource`].
    #[serde(default)]
    pub permission_source: OidcPermissionSource,
    /// Dotted path to the claim holding the user's roles. Keycloak puts realm roles in
    /// `realm_access.roles`; client roles live under
    /// `resource_access.{client_id}.roles`. The claim may be an array of strings or a single
    /// space-separated string.
    #[serde(default = "default_oidc_roles_claim")]
    pub roles_claim: String,
    /// Prefix applied to a provider-side name before it is looked up as an mSupply user account
    /// — to the **role** under `account_source: username_claim`, and to the **group** under
    /// `account_source: group`. With `role_`, `dispensary` resolves to the account
    /// `role_dispensary`.
    ///
    /// Strongly recommended: without it any Keycloak role or group that happens to share a name
    /// with a real mSupply user resolves to that user, so whoever administers the realm can reach
    /// a privileged account's permissions — or, under `account_source: group`, the account
    /// itself — by naming a role or group after it.
    #[serde(default)]
    pub role_template_prefix: Option<String>,
    /// End the provider's session when the user logs out of mSupply (OIDC RP-Initiated Logout).
    ///
    /// Off by default, and deliberately so: a realm-wide sign-out is a bigger action than leaving
    /// mSupply, and for most deployments logging out here should not sign the user out of every
    /// other application on the realm.
    ///
    /// With it on, the provider shows its own logout confirmation before returning — mSupply sends
    /// no `id_token_hint`, which is what would let the provider skip that step, because a
    /// front-channel hint travels in a URL the browser requests and would put the identity token
    /// in browser history and the provider's logs. The confirmation is also honest about the blast
    /// radius: it is every application on the realm, not just this one.
    ///
    /// Only sessions the provider authenticated are affected; a password login logs out exactly as
    /// before. Requires the return URL to be registered on the Keycloak client under **Valid post
    /// logout redirect URIs**.
    #[serde(default)]
    pub logout_from_provider: bool,
    /// Label for the sign-in button on the login page.
    #[serde(default = "default_oidc_button_label")]
    pub button_label: String,
}

fn default_oidc_scopes() -> Vec<String> {
    vec![
        "openid".to_string(),
        "profile".to_string(),
        "email".to_string(),
    ]
}

fn default_oidc_username_claim() -> String {
    "preferred_username".to_string()
}

fn default_oidc_roles_claim() -> String {
    "realm_access.roles".to_string()
}

fn default_oidc_group_claim() -> String {
    "groups".to_string()
}

fn default_oidc_button_label() -> String {
    "Sign in with Keycloak".to_string()
}

/// Builds a `Settings` value suitable for tests, given the `DatabaseSettings`
/// produced by the test setup. `features` enables feature flags that gate
/// functionality under test (e.g. `stock_movement`).
pub fn test_settings(
    database: DatabaseSettings,
    features: Option<HashMap<String, bool>>,
) -> Settings {
    Settings {
        server: ServerSettings {
            port: 0,
            danger_allow_http: false,
            debug_no_access_control: true,
            discovery: DiscoveryMode::Disabled,
            cors_origins: vec![],
            base_dir: "test_output".to_string(),
            machine_uid: None,
            override_is_central_server: false,
            standalone_store_name: None,
            standalone_admin_username: None,
            standalone_admin_password: None,
            workers: None,
            inactivity_timeout_seconds: DEFAULT_INACTIVITY_TIMEOUT_SECONDS,
            token_refresh_interval_seconds: DEFAULT_TOKEN_REFRESH_INTERVAL_SECONDS,
            frontend_dir: default_frontend_dir(),
        },
        database,
        sync: None,
        logging: None,
        backup: None,
        mail: None,
        features,
        changelog_partition: None,
        changelog_dedup: None,
        oidc: None,
    }
}

impl ServerSettings {
    pub fn address(&self) -> String {
        format!("0.0.0.0:{}", self.port)
    }

    /// Http server port for graphql used in discovery, defaults to port + 1
    pub fn discovery_address(&self) -> String {
        format!("0.0.0.0:{}", self.port + 1)
    }
}

/// See backup cli for more details
#[derive(Deserialize, Serialize, Clone)]
pub struct BackupSettings {
    // Root folder for backup
    pub backup_dir: String,
    // Directory containing postgres binaries (in case pg_dump and pg_restore are not in PATH)
    pub pg_bin_dir: Option<String>,
    // Number of backups to keep
    pub max_number_of_backups: Option<u32>,
}

pub fn is_develop() -> bool {
    // debug_assertions is the recommended way to check if we are in 'dev' mode
    cfg!(debug_assertions)
}

#[derive(Deserialize, Serialize, Clone)]
pub enum LogMode {
    All,
    Console,
    File,
}

#[derive(Deserialize, Serialize, Clone, Default)]
pub enum DiscoveryMode {
    #[default]
    Auto,
    Enabled,
    Disabled,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub enum Level {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

impl Display for Level {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        let level = match self {
            Level::Error => "error",
            Level::Warn => "warn",
            Level::Info => "info",
            Level::Debug => "debug",
            Level::Trace => "trace",
        };
        write!(f, "{level}")
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct LoggingSettings {
    /// Console (default) | File
    pub mode: LogMode,
    ///  Off | Error | Warn | Info (default) | Debug | Trace
    pub level: Level,
    /// Max number of temp logfiles to retain
    pub directory: Option<String>,
    pub filename: Option<String>,
    pub max_file_count: Option<i64>,
    /// Max logfile size in MB
    pub max_file_size: Option<usize>,
}

impl LoggingSettings {
    pub fn new(mode: LogMode, level: Level) -> Self {
        LoggingSettings {
            mode,
            level,
            directory: None,
            filename: None,
            max_file_count: None,
            max_file_size: None,
        }
    }

    pub fn with_directory(mut self, directory: String) -> Self {
        self.directory = Some(directory);
        self
    }
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DisplaySettingNode {
    pub value: String,
    pub hash: String,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DisplaySettingsNode {
    pub custom_logo: Option<DisplaySettingNode>,
    pub custom_theme: Option<DisplaySettingNode>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct DisplaySettingsInput {
    pub custom_logo: Option<String>,
    pub custom_theme: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct LabelPrinterSettingNode {
    pub address: String,
    pub label_height: i32,
    pub label_width: i32,
    pub port: u16,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct MailSettings {
    pub port: u16,
    pub host: String,
    pub starttls: bool, //SmtpTransport::starttls_relay(host) vs SmtpTransport::builder_dangerous(host).port(port)
    pub username: String,
    pub password: String,
    pub from: String,
    pub interval: u64,
}

/// yaml-bound config for the postgres `changelog` partitioned table. The
/// migration-internal counterpart lives in `repository::migrations::ChangelogPartitionConfig`
/// (no serde, primitive values only); the server converts service → repository
/// before calling `migrate()`.
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct ChangelogPartitionSettings {
    // Privates — exposed via getter
    #[serde(default = "default_partition_size")]
    partition_size: i64,
    #[serde(default = "default_lookahead")]
    lookahead: i64,

    // public fields
    #[serde(default)]
    pub interval: IntervalSettings,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct IntervalSettings {
    #[serde(default)]
    pub hours: u64,
    #[serde(default = "default_interval_mins")]
    pub mins: u64,
    #[serde(default)]
    pub secs: u64,
}

fn default_partition_size() -> i64 {
    DEFAULT_CHANGELOG_PARTITION_SIZE
}
fn default_lookahead() -> i64 {
    DEFAULT_CHANGELOG_LOOKAHEAD
}
fn default_interval_mins() -> u64 {
    30
}

impl Default for ChangelogPartitionSettings {
    fn default() -> Self {
        Self {
            partition_size: default_partition_size(),
            lookahead: default_lookahead(),
            interval: IntervalSettings::default(),
        }
    }
}

impl Default for IntervalSettings {
    fn default() -> Self {
        Self {
            hours: 0,
            mins: default_interval_mins(),
            secs: 0,
        }
    }
}

impl IntervalSettings {
    pub fn as_duration(&self) -> std::time::Duration {
        std::time::Duration::from_secs(self.hours * 3600 + self.mins * 60 + self.secs)
    }
}

impl ChangelogPartitionSettings {
    /// Effective partition size — yaml value clamped to at least 1
    /// 1 is purely defensive to prevent division by zero
    pub fn partition_size(&self) -> i64 {
        self.partition_size.max(1)
    }

    /// Effective lookahead in cursor records — yaml value clamped up to
    /// `DEFAULT_CHANGELOG_LOOKAHEAD` (the default doubles as the lower bound,
    /// so the runtime top-up always has at least the default headroom).
    pub fn lookahead(&self) -> i64 {
        self.lookahead.max(DEFAULT_CHANGELOG_LOOKAHEAD)
    }

    /// Convert to the migration-internal primitive config that
    /// `migrate()` and `ensure_partition_lookahead` accept.
    pub fn to_migration_config(&self) -> ChangelogPartitionConfig {
        ChangelogPartitionConfig {
            partition_size: self.partition_size(),
            lookahead: self.lookahead(),
        }
    }
}

/// yaml-bound config for the scheduled changelog deduplication task
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct ChangelogDedupSettings {
    #[serde(default)]
    pub interval: IntervalSettings,
    /// When set, dedup only runs while the local clock is within [from, to].
    /// When absent, dedup runs on every `interval` tick with no time gating.
    #[serde(default)]
    pub time_window: Option<TimeWindow>,
    // Private — exposed via getter.
    #[serde(default = "default_dedup_batch")]
    batch_size: i64,
}

/// A local-clock time-of-day window. `from`/`to` are `"HH:MM"` in yaml, parsed to
/// `NaiveTime` at deserialize time — a malformed value fails config loading at
/// startup rather than silently disabling the task. Same-day only (midnight-
/// crossing windows are not yet supported).
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct TimeWindow {
    #[serde(with = "hh_mm")]
    pub from: chrono::NaiveTime,
    #[serde(with = "hh_mm")]
    pub to: chrono::NaiveTime,
}

/// serde (de)serialiser for `NaiveTime` <-> `"HH:MM"` yaml strings.
mod hh_mm {
    use chrono::NaiveTime;
    use serde::{Deserialize, Deserializer, Serializer};

    const FORMAT: &str = "%H:%M";

    pub fn serialize<S: Serializer>(time: &NaiveTime, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&time.format(FORMAT).to_string())
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<NaiveTime, D::Error> {
        let raw = String::deserialize(d)?;
        NaiveTime::parse_from_str(raw.trim(), FORMAT).map_err(|_| {
            serde::de::Error::custom(format!("time_window time must be \"HH:MM\", got {raw:?}"))
        })
    }
}

fn default_dedup_batch() -> i64 {
    50_000
}

fn default_dedup_interval_hours() -> u64 {
    24
}

impl Default for ChangelogDedupSettings {
    fn default() -> Self {
        Self {
            interval: IntervalSettings {
                hours: default_dedup_interval_hours(),
                mins: 0,
                secs: 0,
            },
            time_window: None,
            batch_size: default_dedup_batch(),
        }
    }
}

impl ChangelogDedupSettings {
    /// Effective batch size — yaml value clamped to at least 1.
    pub fn batch_size(&self) -> i64 {
        self.batch_size.max(1)
    }
}

impl TimeWindow {
    /// True when `now` is within the [from, to] window (same-day).
    pub fn contains(&self, now: chrono::NaiveTime) -> bool {
        now >= self.from && now <= self.to
    }
}

#[cfg(test)]
mod test {
    use super::ChangelogDedupSettings;
    use chrono::NaiveTime;

    #[test]
    fn time_window_parses_hh_mm() {
        let s: ChangelogDedupSettings =
            serde_yaml::from_str("time_window:\n  from: \"02:00\"\n  to: \"05:30\"").unwrap();
        let window = s.time_window.unwrap();
        assert_eq!(window.from, NaiveTime::from_hms_opt(2, 0, 0).unwrap());
        assert_eq!(window.to, NaiveTime::from_hms_opt(5, 30, 0).unwrap());
        assert!(window.contains(NaiveTime::from_hms_opt(3, 0, 0).unwrap()));
        assert!(!window.contains(NaiveTime::from_hms_opt(6, 0, 0).unwrap()));
    }

    #[test]
    fn time_window_rejects_bad_format() {
        // A malformed HH:MM must fail deserialization (config load) rather than
        // silently disabling the task.
        let result: Result<ChangelogDedupSettings, _> =
            serde_yaml::from_str("time_window:\n  from: \"2pm\"\n  to: \"05:00\"");
        assert!(result.is_err());
    }
}
