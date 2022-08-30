#[cfg(windows)]
extern crate winres;

#[cfg(windows)]
fn main() {
    let mut res = winres::WindowsResource::new();
    res.set_icon("omSupply.ico");
    res.compile().unwrap();
}

// Just to skip build error as the build dependencies for "winres" is being used for "windows" targeted
// This way the build time for the unix based platform gets saved
#[cfg(unix)]
fn main() {
}
