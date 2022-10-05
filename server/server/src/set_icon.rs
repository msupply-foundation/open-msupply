#[cfg(windows)]
extern crate winres;

#[cfg(windows)]
fn main() {
    let mut res = winres::WindowsResource::new();
    res.set_icon("omSupply.ico");
    // The winres crate compiles the icon into a Windows resource file and directs cargo to link it into the output binary
    res.compile().unwrap();
}

// Keep the unix build happy
#[cfg(unix)]
fn main() {}
