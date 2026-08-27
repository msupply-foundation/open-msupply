use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, NaiveDateTime, Utc};
use std::{
    collections::BTreeMap,
    fs::{self, File},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
};

/// Aggregate sync_v7 push/pull throughput from OMS central log file(s) into a CSV.
///
/// A central server logs a line for every batch it serves (see
/// service/src/sync_v7/sync_on_central/mod.rs):
///
///     sync_v7 pull site_id=<id> records=<n> remaining=<n>
///     sync_v7 push site_id=<id> records=<n> remaining=<n>
///
/// Each is prefixed by simple-log's default "%Y-%m-%d %H:%M:%S.%f" timestamp, e.g.
///
///     2026-06-10 09:14:32.123456789 [INFO ] <...mod:307>:sync_v7 pull site_id=a records=500 remaining=0
///
/// These lines are present in any deployment logging at level Info (or lower) to file, so this
/// works on production logs at any time, not only on a load test's output.
///
/// The `records` counts are bucketised into fixed-width time windows (default 5 seconds), and
/// for each bucket we emit total / average-per-second for pushed, pulled, and the two combined.
/// Empty buckets between the first and last event are emitted as zero rows so the series stays
/// continuous (and per-second averages stay meaningful) for graphing.
#[derive(clap::Args)]
pub struct SyncThroughputCsv {
    /// Log file(s) and/or directories to read (directories are searched recursively)
    #[clap(required = true)]
    pub logs: Vec<PathBuf>,

    /// Width of each aggregation bucket, in seconds
    #[clap(short, long, default_value = "5")]
    pub bucket_seconds: i64,

    /// Write CSV to this file instead of stdout
    #[clap(short, long)]
    pub output: Option<PathBuf>,
}

#[derive(Default, Clone, Copy)]
struct Bucket {
    pushed: i64,
    pulled: i64,
}

impl SyncThroughputCsv {
    pub fn run(&self) -> Result<()> {
        if self.bucket_seconds <= 0 {
            return Err(anyhow!("--bucket-seconds must be a positive integer"));
        }

        // bucket_start (epoch seconds, floored to bucket width) -> totals
        let mut buckets: BTreeMap<i64, Bucket> = BTreeMap::new();
        let mut events = 0u64;

        for path in collect_log_files(&self.logs)? {
            let file = File::open(&path)
                .with_context(|| format!("Failed to open log file {}", path.display()))?;
            for line in BufReader::new(file).lines() {
                let line = line?;
                let Some((direction, records)) = parse_event(&line) else {
                    continue;
                };
                let Some(epoch) = parse_epoch_seconds(&line) else {
                    continue;
                };
                events += 1;
                let start = epoch - epoch.rem_euclid(self.bucket_seconds);
                let bucket = buckets.entry(start).or_default();
                match direction {
                    Direction::Push => bucket.pushed += records,
                    Direction::Pull => bucket.pulled += records,
                }
            }
        }

        if events == 0 {
            eprintln!("No sync_v7 push/pull log lines found.");
        }

        // Fill empty buckets between the first and last event with zeros so the time series is
        // continuous and per-second averages don't silently skip idle windows.
        if let (Some(&first), Some(&last)) = (buckets.keys().next(), buckets.keys().next_back()) {
            let mut start = first;
            while start < last {
                buckets.entry(start).or_default();
                start += self.bucket_seconds;
            }
        }

        let csv = self.to_csv(&buckets);
        match &self.output {
            Some(path) => {
                let mut file = File::create(path)
                    .with_context(|| format!("Failed to create output file {}", path.display()))?;
                file.write_all(csv.as_bytes())?;
                println!("Wrote {} buckets to {}", buckets.len(), path.display());
            }
            None => print!("{csv}"),
        }

        Ok(())
    }

    fn to_csv(&self, buckets: &BTreeMap<i64, Bucket>) -> String {
        let width = self.bucket_seconds as f64;
        let mut out = String::from(
            "bucket_start,elapsed_seconds,total_pushed,avg_per_second_pushed,total_pulled,\
             avg_per_second_pulled,total_combined,avg_per_second_combined\n",
        );

        let first = buckets.keys().next().copied().unwrap_or(0);
        for (&start, bucket) in buckets {
            let combined = bucket.pushed + bucket.pulled;
            let bucket_start = DateTime::<Utc>::from_timestamp(start, 0)
                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                .unwrap_or_default();
            out.push_str(&format!(
                "{},{},{},{:.2},{},{:.2},{},{:.2}\n",
                bucket_start,
                start - first,
                bucket.pushed,
                bucket.pushed as f64 / width,
                bucket.pulled,
                bucket.pulled as f64 / width,
                combined,
                combined as f64 / width,
            ));
        }
        out
    }
}

/// Expand the given paths into a sorted list of files: directories are walked recursively,
/// plain files are taken as-is. The parser ignores non-matching lines, so pointing at a
/// directory of mixed logs is safe.
fn collect_log_files(paths: &[PathBuf]) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    for path in paths {
        collect_into(path, &mut files)?;
    }
    files.sort();
    Ok(files)
}

fn collect_into(path: &Path, files: &mut Vec<PathBuf>) -> Result<()> {
    let metadata =
        fs::metadata(path).with_context(|| format!("Failed to read {}", path.display()))?;
    if metadata.is_dir() {
        for entry in fs::read_dir(path)
            .with_context(|| format!("Failed to read directory {}", path.display()))?
        {
            collect_into(&entry?.path(), files)?;
        }
    } else {
        files.push(path.to_path_buf());
    }
    Ok(())
}

#[derive(Clone, Copy)]
enum Direction {
    Push,
    Pull,
}

/// Extract the direction and `records=<n>` count from a sync_v7 push/pull log line.
fn parse_event(line: &str) -> Option<(Direction, i64)> {
    let direction = if line.contains("sync_v7 push") {
        Direction::Push
    } else if line.contains("sync_v7 pull") {
        Direction::Pull
    } else {
        return None;
    };

    let rest = &line[line.find("records=")? + "records=".len()..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    Some((direction, digits.parse().ok()?))
}

/// Parse the epoch seconds from simple-log's leading "%Y-%m-%d %H:%M:%S.%f" timestamp.
/// Sub-second precision is dropped — it never changes which (>=1s) bucket an event lands in.
fn parse_epoch_seconds(line: &str) -> Option<i64> {
    // The timestamp is the first 19 chars ("YYYY-MM-DD HH:MM:SS"); `get` keeps us safe on
    // non-timestamp lines that might not be 19 bytes or split a multibyte char.
    let timestamp = line.trim_start().get(..19)?;
    let dt = NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%d %H:%M:%S").ok()?;
    Some(dt.and_utc().timestamp())
}
