//! Phone-native decode and JPEG re-encode, through Apple's ImageIO.
//!
//! No Rust crate decodes HEIC at a cost this repository can pay: `image`
//! 0.25 excludes HEIF on patent grounds, `libheif-rs` needs a Homebrew
//! `libheif` and puts an LGPL native library in an MIT bundle, and the one
//! pure-Rust decoder is AGPL-only. ImageIO is on every Mac, is Apple's own
//! licensed decoder, reads DNG through the same interface, and adds no build
//! step. `sips -s format jpeg` is the same machinery through a subprocess and
//! is the recorded fallback if these bindings ever prove troublesome.
//!
//! The conversion carries no metadata across. The source's property
//! dictionary is never handed to the destination, so the written JPEG stands
//! upright — the orientation is applied to the pixels — and carries no EXIF,
//! which is how this path keeps the no-machine discipline: a phone
//! photograph's EXIF holds GPS coordinates and the camera owner's name.
//!
//! The same call re-encodes an ordinary JPEG or PNG that arrived carrying
//! EXIF, which is why it takes bytes rather than a format.

/// The quality a converted JPEG is written at.
#[cfg(target_os = "macos")]
const JPEG_QUALITY: f64 = 0.82;

/// The uniform type identifier a conversion writes.
#[cfg(target_os = "macos")]
const JPEG_UTI: &str = "public.jpeg";

/// Whether this build can convert at all.
pub const fn available() -> bool {
    cfg!(target_os = "macos")
}

/// Decode `bytes` and re-encode them as a JPEG holding no metadata.
///
/// An error is a refusal, not a fallback: a reference to a picture that is not
/// the picture is a quiet lie inside a document meant to be portable, and
/// leaving the phone-native original is what the intent forbids.
#[cfg(target_os = "macos")]
pub fn to_web_jpeg(bytes: &[u8]) -> Result<Vec<u8>, String> {
    use core::ffi::c_void;

    use objc2_core_foundation::{
        kCFTypeDictionaryKeyCallBacks, kCFTypeDictionaryValueCallBacks, CFBoolean, CFData,
        CFMutableData, CFMutableDictionary, CFNumber, CFString,
    };
    use objc2_image_io::{
        kCGImageDestinationLossyCompressionQuality, kCGImageSourceCreateThumbnailFromImageAlways,
        kCGImageSourceCreateThumbnailWithTransform, CGImageDestination, CGImageSource,
    };

    if bytes.is_empty() {
        return Err("the file is empty".to_string());
    }
    let length = isize::try_from(bytes.len()).map_err(|_| "the file is too large".to_string())?;

    // SAFETY: `bytes` outlives the call, and `CFDataCreate` copies it.
    let source_data = unsafe { CFData::new(None, bytes.as_ptr(), length) }
        .ok_or_else(|| "cannot hold the file in memory".to_string())?;
    // SAFETY: no options are passed, so there are no generics to get wrong.
    let source = unsafe { CGImageSource::with_data(&source_data, None) }
        .ok_or_else(|| "the image cannot be read".to_string())?;

    // A thumbnail with `WithTransform` and no maximum size is the full image
    // with its orientation baked into the pixels, which is the one ImageIO
    // call that rotates without a CGContext of our own.
    // SAFETY: the two callback tables are Core Foundation's own.
    let read_options = unsafe {
        CFMutableDictionary::new(
            None,
            2,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks,
        )
    }
    .ok_or_else(|| "cannot describe the read".to_string())?;
    let yes = CFBoolean::new(true);
    // SAFETY: the keys are ImageIO's own statics and the value is a CFBoolean.
    unsafe {
        CFMutableDictionary::set_value(
            Some(&read_options),
            kCGImageSourceCreateThumbnailFromImageAlways as *const CFString as *const c_void,
            yes as *const CFBoolean as *const c_void,
        );
        CFMutableDictionary::set_value(
            Some(&read_options),
            kCGImageSourceCreateThumbnailWithTransform as *const CFString as *const c_void,
            yes as *const CFBoolean as *const c_void,
        );
    }
    // SAFETY: the options dictionary holds the types the keys expect.
    let image = unsafe { source.thumbnail_at_index(0, Some(&read_options)) }
        .or_else(|| unsafe { source.image_at_index(0, None) })
        .ok_or_else(|| "the image cannot be decoded".to_string())?;

    let written = CFMutableData::new(None, 0).ok_or_else(|| "cannot hold the JPEG".to_string())?;
    let uti = CFString::from_str(JPEG_UTI);
    // SAFETY: no options are passed.
    let destination = unsafe { CGImageDestination::with_data(&written, &uti, 1, None) }
        .ok_or_else(|| "cannot write a JPEG".to_string())?;

    // SAFETY: the two callback tables are Core Foundation's own.
    let write_options = unsafe {
        CFMutableDictionary::new(
            None,
            1,
            &kCFTypeDictionaryKeyCallBacks,
            &kCFTypeDictionaryValueCallBacks,
        )
    }
    .ok_or_else(|| "cannot describe the write".to_string())?;
    let quality = CFNumber::new_f64(JPEG_QUALITY);
    // SAFETY: the key is ImageIO's own static and the value is a CFNumber.
    unsafe {
        CFMutableDictionary::set_value(
            Some(&write_options),
            kCGImageDestinationLossyCompressionQuality as *const CFString as *const c_void,
            &*quality as *const CFNumber as *const c_void,
        );
    }
    // SAFETY: the properties dictionary holds the type the key expects. Only
    // these properties are written, so nothing of the source's metadata
    // reaches the file.
    unsafe { destination.add_image(&image, Some(&write_options)) };
    // SAFETY: the destination is still alive and has one image.
    if !unsafe { destination.finalize() } {
        return Err("the JPEG could not be finished".to_string());
    }

    let out_length = usize::try_from(written.length()).unwrap_or(0);
    if out_length == 0 {
        return Err("the conversion produced nothing".to_string());
    }
    let pointer = written.byte_ptr();
    if pointer.is_null() {
        return Err("the conversion produced nothing".to_string());
    }
    // SAFETY: `pointer` is the buffer Core Foundation just filled, and
    // `out_length` is the length it reports for it.
    Ok(unsafe { std::slice::from_raw_parts(pointer, out_length) }.to_vec())
}

/// Every other platform has no ImageIO, so the drop is refused rather than
/// leaving the original behind.
#[cfg(not(target_os = "macos"))]
pub fn to_web_jpeg(_bytes: &[u8]) -> Result<Vec<u8>, String> {
    Err("converting an image needs macOS".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A one-pixel PNG, which every platform's ImageIO reads.
    const TINY_PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8,
        0xCF, 0xC0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    #[test]
    #[cfg(target_os = "macos")]
    fn writes_a_jpeg_from_an_image_it_can_read() {
        let jpeg = to_web_jpeg(TINY_PNG).expect("ImageIO reads a PNG");
        assert_eq!(&jpeg[..3], &[0xFF, 0xD8, 0xFF], "the answer is a JPEG");
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn refuses_a_file_it_cannot_decode() {
        assert!(to_web_jpeg(b"not an image at all").is_err());
        assert!(to_web_jpeg(b"").is_err());
    }

    #[test]
    fn says_whether_it_can_convert() {
        assert_eq!(available(), cfg!(target_os = "macos"));
    }
}
