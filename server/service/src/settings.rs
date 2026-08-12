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
    pub ledger_check: Option<LedgerCheckSettings>,
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
        ledger_check: None,
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

/// What the ledger check does when it finds a discrepancy.
#[derive(Deserialize, Serialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum LedgerCheckMode {
    /// Stop the server on any discrepancy. The default in debug builds, and the point of
    /// #12582 - a ledger bug is cheap to diagnose now and expensive in six months.
    Stop,
    /// Stop the server only for stock lines that were consistent when the server started.
    /// The fallback for a database you inherited rather than broke: a copy of customer data
    /// typically has discrepancies nobody can fix (see the ledger_fix docs), which under
    /// `stop` would prevent the server starting at all. Regressions you introduce still stop
    /// it; the pre-existing set is listed at startup and then ignored.
    StopOnNew,
    /// Never stop the server; log and write a system log. The default in release builds, where
    /// that system log is the stream #9552's support report is built on. Also the right setting
    /// where a panic is worse than a silent bug: Android (a panic kills the server thread while
    /// the Java side still thinks the server is up) and the Windows service (the SCM only sees
    /// a crash, error 1067).
    Warn,
}

impl LedgerCheckMode {
    /// Whether the server is ever stopped in this mode.
    pub fn stops_the_server(&self) -> bool {
        !matches!(self, LedgerCheckMode::Warn)
    }
}

/// How long between ledger scans.
///
/// Deliberately *not* the shared `IntervalSettings`: that defaults `mins` to 30, so
/// `interval: { secs: 30 }` would silently mean 30 minutes 30 seconds. That default is sensible
/// for the changelog tasks it was written for, but here it would quietly turn the 30-second
/// developer feedback loop into a half-hourly one. Every field here defaults to zero, so the
/// yaml means what it says.
#[derive(Deserialize, Serialize, Clone, Debug, Default, PartialEq)]
pub struct LedgerCheckInterval {
    #[serde(default)]
    pub hours: u64,
    #[serde(default)]
    pub mins: u64,
    #[serde(default)]
    pub secs: u64,
}

impl LedgerCheckInterval {
    pub fn as_duration(&self) -> std::time::Duration {
        std::time::Duration::from_secs(self.hours * 3600 + self.mins * 60 + self.secs)
    }
}

/// yaml-bound config for the periodic stock line ledger consistency check
/// (`service::ledger_fix::ledger_check`).
///
/// The defaults differ by build profile, because the two audiences need opposite things: a debug
/// build checks every 30 seconds and stops the server, so whoever broke the ledger finds out
/// immediately; a release build checks daily and just logs, feeding the system log stream that
/// #9552's support report is built on. Both halves are overridable here.
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LedgerCheckSettings {
    /// Runs in every build profile by default. `APP__LEDGER_CHECK__ENABLED=false` also works.
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// Absent means 30 seconds in a debug build, a day in a release build. `Option` because with
    /// a plain `#[serde(default)]` there is no way to tell "absent" from an explicit value.
    #[serde(default)]
    interval: Option<LedgerCheckInterval>,
    /// Absent means `stop` in a debug build and `warn` in a release build. See `LedgerCheckMode`;
    /// `stop-on-new` is the one to reach for on a database that is already inconsistent.
    #[serde(default)]
    mode: Option<LedgerCheckMode>,
}

fn default_true() -> bool {
    true
}

const DEBUG_LEDGER_CHECK_INTERVAL_SECS: u64 = 30;
const RELEASE_LEDGER_CHECK_INTERVAL_HOURS: u64 = 24;

impl Default for LedgerCheckSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            interval: None,
            mode: None,
        }
    }
}

impl LedgerCheckSettings {
    /// How long between scheduled scans. Short in a debug build so a developer finds out
    /// immediately; daily in a release build, which is the cadence #9552's report expects.
    pub fn interval(&self) -> std::time::Duration {
        match &self.interval {
            Some(interval) => interval.as_duration(),
            None if is_develop() => {
                std::time::Duration::from_secs(DEBUG_LEDGER_CHECK_INTERVAL_SECS)
            }
            None => std::time::Duration::from_secs(RELEASE_LEDGER_CHECK_INTERVAL_HOURS * 3600),
        }
    }

    /// What happens on a discrepancy - stop the server (debug) or just log it (release).
    pub fn mode(&self) -> LedgerCheckMode {
        self.mode.unwrap_or(if is_develop() {
            LedgerCheckMode::Stop
        } else {
            LedgerCheckMode::Warn
        })
    }

    /// Defaults, but never stops the server whatever the build profile. Used by the Android
    /// entry point.
    pub fn warn_only() -> Self {
        Self {
            mode: Some(LedgerCheckMode::Warn),
            ..Default::default()
        }
    }

    /// Test constructor: an explicit mode and interval.
    #[cfg(test)]
    pub(crate) fn for_test(mode: LedgerCheckMode, interval: std::time::Duration) -> Self {
        Self {
            enabled: true,
            interval: Some(LedgerCheckInterval {
                hours: 0,
                mins: 0,
                secs: interval.as_secs(),
            }),
            mode: Some(mode),
        }
    }
}

#[cfg(test)]
mod test {
    use super::{is_develop, ChangelogDedupSettings, LedgerCheckMode, LedgerCheckSettings};
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

    /// The whole point of the split: a developer gets a fast crash, a production site gets a
    /// daily log entry. Both come from the same component, so the defaults have to diverge here.
    #[test]
    fn ledger_check_defaults_differ_by_build_profile() {
        let settings = LedgerCheckSettings::default();

        assert!(settings.enabled, "must run in every build profile");
        if is_develop() {
            assert_eq!(settings.interval().as_secs(), 30);
            assert_eq!(settings.mode(), LedgerCheckMode::Stop);
        } else {
            assert_eq!(settings.interval().as_secs(), 24 * 60 * 60);
            assert_eq!(settings.mode(), LedgerCheckMode::Warn);
        }
        assert!(settings.mode().stops_the_server() == is_develop());
    }

    /// A section that sets one field must not silently reset the others to non-profile defaults.
    #[test]
    fn ledger_check_partial_yaml_keeps_the_other_defaults() {
        let from_yaml: LedgerCheckSettings = serde_yaml::from_str("mode: warn").unwrap();

        assert!(from_yaml.enabled);
        assert_eq!(from_yaml.mode(), LedgerCheckMode::Warn);
        assert_eq!(
            from_yaml.interval(),
            LedgerCheckSettings::default().interval()
        );
    }

    #[test]
    fn ledger_check_yaml_overrides_the_build_profile() {
        let off: LedgerCheckSettings = serde_yaml::from_str("enabled: false").unwrap();
        assert!(!off.enabled);

        // A release build can be made to crash, and a debug build to only log
        let crashing: LedgerCheckSettings = serde_yaml::from_str("mode: stop").unwrap();
        assert_eq!(crashing.mode(), LedgerCheckMode::Stop);
        assert_eq!(
            LedgerCheckSettings::warn_only().mode(),
            LedgerCheckMode::Warn
        );

        let slow: LedgerCheckSettings =
            serde_yaml::from_str("interval:\n  hours: 2\n  mins: 30\n  secs: 0").unwrap();
        assert_eq!(slow.interval().as_secs(), 2 * 3600 + 30 * 60);
    }

    /// A partially specified interval must mean what it says. Reusing the shared
    /// `IntervalSettings` here was a trap: its `mins` defaults to 30, so `{ secs: 5 }` silently
    /// became 30m5s and quietly turned the 30-second developer feedback loop half-hourly.
    #[test]
    fn ledger_check_partial_interval_does_not_pick_up_a_hidden_default() {
        let only_secs: LedgerCheckSettings = serde_yaml::from_str("interval:\n  secs: 5").unwrap();
        assert_eq!(only_secs.interval().as_secs(), 5);

        let only_mins: LedgerCheckSettings = serde_yaml::from_str("interval:\n  mins: 2").unwrap();
        assert_eq!(only_mins.interval().as_secs(), 120);

        let only_hours: LedgerCheckSettings =
            serde_yaml::from_str("interval:\n  hours: 1").unwrap();
        assert_eq!(only_hours.interval().as_secs(), 3600);
    }

    /// The mode names are the yaml surface, so they are part of the config contract.
    #[test]
    fn ledger_check_mode_yaml_names_are_kebab_case() {
        let parse = |yaml: &str| {
            serde_yaml::from_str::<LedgerCheckSettings>(yaml)
                .unwrap()
                .mode()
        };

        assert_eq!(parse("mode: stop"), LedgerCheckMode::Stop);
        assert_eq!(parse("mode: stop-on-new"), LedgerCheckMode::StopOnNew);
        assert_eq!(parse("mode: warn"), LedgerCheckMode::Warn);

        assert!(serde_yaml::from_str::<LedgerCheckSettings>("mode: nonsense").is_err());
        // stop-on-new still stops the server, just not for pre-existing discrepancies
        assert!(LedgerCheckMode::StopOnNew.stops_the_server());
        assert!(!LedgerCheckMode::Warn.stops_the_server());
    }
}
