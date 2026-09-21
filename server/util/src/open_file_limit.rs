//! Raises the process's open file descriptor limit (`RLIMIT_NOFILE`).
//!
//! Every HTTP connection, database pool connection, SQLite handle, TLS socket,
//! report and log file costs one descriptor. The default soft limit is small
//! (256 on macOS, 1024 on many Linux distributions), so under load the OS
//! refuses new sockets and the failure surfaces as "connection refused" or
//! "Too many open files" with no hint of the cause. Raising the soft limit at
//! startup means a default install doesn't need `ulimit`, launchd or systemd
//! tuning.
//!
//! Unix only. Windows has no equivalent and its per-process handle limit is
//! not a practical concern; Android is skipped because the app process is
//! managed by the platform.

use std::io;

/// The soft limit to aim for. Capped by the hard limit.
pub const OPEN_FILE_LIMIT_TARGET: u64 = 65_536;

/// Below this the server is likely to run out of descriptors under modest load.
pub const OPEN_FILE_LIMIT_LOW_WATERMARK: u64 = 1024;

/// The soft limit before and after [`raise_open_file_limit`] ran.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OpenFileLimit {
    pub previous: u64,
    pub current: u64,
}

impl OpenFileLimit {
    pub fn was_raised(&self) -> bool {
        self.current > self.previous
    }

    pub fn is_low(&self) -> bool {
        self.current < OPEN_FILE_LIMIT_LOW_WATERMARK
    }

    /// The info-level line describing what happened.
    pub fn summary(&self) -> String {
        if self.was_raised() {
            format!(
                "Raised open file limit from {} to {}",
                self.previous, self.current
            )
        } else {
            format!("Open file limit is {}", self.current)
        }
    }

    /// The warning to log when the limit is still too low to be safe under load, if any.
    pub fn low_warning(&self) -> Option<String> {
        self.is_low().then(|| {
            format!(
                "Open file limit is {}, below the recommended minimum of {}. The server may \
                 run out of file descriptors under load; raise the hard limit (ulimit -Hn, \
                 launchd or systemd LimitNOFILE) for this process",
                self.current, OPEN_FILE_LIMIT_LOW_WATERMARK
            )
        })
    }
}

/// Raises the soft `RLIMIT_NOFILE` to `min(hard, OPEN_FILE_LIMIT_TARGET)` and logs the
/// outcome. Never lowers the limit and never fails: a refusal from the OS is logged and the
/// process carries on with whatever it had. Call this before opening database pools or binding
/// sockets so they run under the raised limit.
///
/// Returns `None` on platforms where there is nothing to do, or if the OS refused.
pub fn raise_open_file_limit() -> Option<OpenFileLimit> {
    #[cfg(all(unix, not(target_os = "android")))]
    {
        raise_and_log(|| unix::raise_open_file_limit_to(OPEN_FILE_LIMIT_TARGET))
    }

    #[cfg(not(all(unix, not(target_os = "android"))))]
    {
        log::debug!("Open file limit is not adjusted on this platform");
        None
    }
}

/// Runs `raise` and logs what it reports. Split from the syscall so the logging and
/// error-handling decisions can be tested with a stand-in.
#[cfg_attr(not(all(unix, not(target_os = "android"))), allow(dead_code))]
fn raise_and_log(raise: impl FnOnce() -> io::Result<OpenFileLimit>) -> Option<OpenFileLimit> {
    let limit = match raise() {
        Ok(limit) => limit,
        Err(error) => {
            log::warn!("Failed to raise open file limit: {error}");
            return None;
        }
    };

    log::info!("{}", limit.summary());
    if let Some(warning) = limit.low_warning() {
        log::warn!("{warning}");
    }

    Some(limit)
}

#[cfg(all(unix, not(target_os = "android")))]
pub mod unix {
    use super::OpenFileLimit;
    use rlimit::Resource;
    use std::io;

    /// Raises the soft `RLIMIT_NOFILE` to `min(hard, target)`. The limit is never lowered: if
    /// the soft limit is already at or above the target it is left alone.
    ///
    /// `rlimit::increase_nofile_limit` also caps at `kern.maxfilesperproc` on macOS, where
    /// the hard limit reports as infinity but `setrlimit` rejects anything above the sysctl.
    pub fn raise_open_file_limit_to(target: u64) -> io::Result<OpenFileLimit> {
        let previous = Resource::NOFILE.get_soft()?;
        let current = rlimit::increase_nofile_limit(target)?;
        Ok(OpenFileLimit { previous, current })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn limit(previous: u64, current: u64) -> OpenFileLimit {
        OpenFileLimit { previous, current }
    }

    #[test]
    fn raised_limit_reports_both_values() {
        let limit = limit(256, 65_536);

        assert!(limit.was_raised());
        assert!(!limit.is_low());
        assert_eq!(limit.summary(), "Raised open file limit from 256 to 65536");
        assert_eq!(limit.low_warning(), None);
    }

    #[test]
    fn unchanged_limit_reports_current_value_only() {
        let limit = limit(1_048_576, 1_048_576);

        assert!(!limit.was_raised());
        assert_eq!(limit.summary(), "Open file limit is 1048576");
        assert_eq!(limit.low_warning(), None);
    }

    #[test]
    fn limit_below_watermark_warns_even_when_raised() {
        let limit = limit(256, 512);

        assert!(limit.was_raised());
        assert!(limit.is_low());
        let warning = limit.low_warning().expect("expected a warning");
        assert!(
            warning.starts_with("Open file limit is 512, below the recommended minimum of 1024")
        );
        assert!(warning.contains("ulimit -Hn"));
    }

    #[test]
    fn limit_at_watermark_is_not_low() {
        assert!(!limit(256, OPEN_FILE_LIMIT_LOW_WATERMARK).is_low());
        assert!(limit(256, OPEN_FILE_LIMIT_LOW_WATERMARK - 1).is_low());
    }

    #[test]
    fn os_refusal_is_swallowed() {
        let result = raise_and_log(|| Err(io::Error::from_raw_os_error(22)));

        assert_eq!(result, None);
    }

    #[test]
    fn successful_raise_is_passed_through() {
        let result = raise_and_log(|| Ok(limit(256, 4096)));

        assert_eq!(result, Some(limit(256, 4096)));
    }

    /// End-to-end against the real process limit. Only asserts what holds regardless of the
    /// limit the test runner's shell started with.
    #[cfg(all(unix, not(target_os = "android")))]
    #[test]
    fn raises_the_real_limit_and_reports_it() {
        let limit = raise_open_file_limit().expect("unix should always report a limit");

        assert!(limit.current >= limit.previous);
        assert!(limit.current <= OPEN_FILE_LIMIT_TARGET.max(limit.previous));
        assert_eq!(rlimit::Resource::NOFILE.get_soft().unwrap(), limit.current);
    }
}
