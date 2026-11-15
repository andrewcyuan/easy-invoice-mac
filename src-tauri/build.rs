fn main() {
    cc::Build::new()
        .file("native/fonts.m")
        .flag("-fobjc-arc")
        .compile("invoice_fonts");
    println!("cargo:rustc-link-lib=framework=AppKit");
    println!("cargo:rustc-link-lib=framework=CoreText");
    println!("cargo:rerun-if-changed=native/fonts.m");
    tauri_build::build()
}
