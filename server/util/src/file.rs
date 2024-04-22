use std::{
    path::{Path, PathBuf},
    str::FromStr,
};

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
