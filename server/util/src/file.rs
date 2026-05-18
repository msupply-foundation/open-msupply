use std::{
    fs::{self, OpenOptions},
    path::{Path, PathBuf},
    str::FromStr,
};

use fs_lock::FileLock;

pub fn prepare_file_dir(dir: &str, base_dir: &Option<String>) -> anyhow::Result<PathBuf> {
    let file_dir = match base_dir {
        Some(file_dir) => PathBuf::from_str(file_dir)?.join(dir),
        None => PathBuf::from_str(dir)?,
    };

    std::fs::create_dir_all(&file_dir)?;

    Ok(file_dir)
}

pub fn move_file(from: &Path, to: &Path) -> std::io::Result<()> {
    // First try to move file on same device. If this fails it might be because `from` and `to` are
    // on different mount points. In this case the file needs to be copied and deleted manually.
    let Err(_) = std::fs::rename(from, to) else {
        return Ok(());
    };

    // The matching error kind is CrossesDevices but is currently unstable. In the future this
    // should work:
    //
    // match err.kind() {
    //     std::io::ErrorKind::CrossesDevices => {}
    //     _ => return Err(err),
    // };
    std::fs::copy(from, to)?;
    std::fs::remove_file(from)?;
    Ok(())
}

pub fn sanitize_filename(filename: String) -> String {
    sanitize_filename::sanitize(filename)
}

/// Creates an exclusive file lock for inter-process synchronization.
///
/// The lock is held until the returned `FileLock` is dropped. If another process already
/// holds the lock, this function will block until the lock becomes available.
///
/// Creates both the directory at `file_path` and the lock file if they don't exist.
pub fn lock_file(file_path: PathBuf, filename: String) -> anyhow::Result<FileLock> {
    let lock_path = file_path.join(filename);
    fs::create_dir_all(&file_path).unwrap();
    let lock_file_handle = OpenOptions::new()
        .create(true)
        .read(true)
        .write(true)
        .open(&lock_path)?;
    let file_lock = FileLock::new_exclusive(lock_file_handle)?;
    Ok(file_lock)
}
