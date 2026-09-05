# How to drop images, videos and files

Drag a file from Finder onto the editing surface and Editor takes it into the
document for you: it copies the bytes into the Part you dropped on, writes the
reference where your cursor is, and leaves the file you dragged exactly as it
was. This page says what happens to each kind of file, and what to do when
Editor refuses one.

## Before you start

- A document folder open, and a chapter on screen.
- The chapter is where the drop lands: a reference belongs to the Part the
  chapter sits in.

## Drop a picture

Drag a PNG, JPEG, GIF, SVG, WebP or AVIF onto the text. Editor copies it into
`assets/` beside the chapter and writes an image reference at the cursor:

```markdown
![](assets/lantern.jpg)
```

The alt text is empty because only you can write it. Type the caption straight
away — the cursor is left inside the brackets for exactly that.

Each Part keeps its own `assets/` folder, so two Parts may each hold a
`lantern.jpg` and neither reference climbs out of its Part. Drop the same file
into a second Part and Editor copies it again rather than pointing across: a
Part that carries its own pictures can be moved, and its chapters still read.

Drop the same file twice into the same Part and Editor writes one copy and
points both references at it.

### What Editor takes out of a picture

Every copied picture loses its metadata before it reaches the document folder:
EXIF, IPTC and XMP on a JPEG, the text chunks and `eXIf` on a PNG, the `EXIF`
and `XMP ` chunks on a WebP, the comment and application blocks on a GIF, and
the comments, `<metadata>` elements and machine paths on an SVG. A phone
photograph's EXIF holds GPS coordinates and the camera owner's name, and a
document meant to be sent to somebody must not carry either.

The bytes of the picture itself are untouched. A JPEG is never re-encoded to
strip a segment: the compressed image reaches `assets/` exactly as it left the
camera, and only the boxes around it are gone.

An AVIF that declares EXIF or XMP inside its container is refused rather than
copied, because taking a box out of that container means rewriting the file.
Export it without metadata and drop it again.

### Photographs from a phone

HEIC, HEIF and DNG are converted to a web JPEG on the way in, because no other
machine reads them. The original is not kept and nothing of it is left in the
document folder.

If the conversion is unavailable, the drop is refused and the modeline names
the file. Nothing is written: a reference to a picture that is not the picture
is a quiet lie inside a document you mean to send somebody.

A file above 64 MiB, or an image above 80 megapixels, is refused rather than
decoded.

## Drop a video

Drop a video file and Editor writes a video block naming it as a local source:

```markdown
::: {.video}
- local: assets/keynote.mp4
:::
```

Paste or drag a public video address instead and Editor writes the same block
with a `remote:` source. Nothing is fetched and nothing is probed: the address
is read, not visited.

A published version carries pictures only, so a local video is a refusal at
publish time rather than a file on the site. Use a `remote:` source for a video
you want at the link.

## Drop anything else

A spreadsheet, a PDF or a plain file becomes a link at the cursor, with the
cursor left in the link text so you can name it.

## Large files

A file at or above the copied-asset threshold — 8 MiB, unless your
`document.yaml` sets `asset_threshold_bytes` — is not copied. Editor records it
in `assets.json` under the name of the folder it came from, and writes an
`asset:` reference:

```markdown
![](asset:7f3a91c2e4d85b06)
```

The manifest names a root rather than a path, so nothing about this machine
reaches the document folder. Resolving that root belongs to a later release;
until then the asset is unresolved, and the deck and the article show the
caption with the picture missing.

## When a drop is refused

One bad file never costs you the others: Editor takes what it can and names
each refusal in the modeline. The common ones are:

| The modeline says | What to do |
|---|---|
| the image could not be converted | Export the photograph as JPEG and drop that. |
| carries metadata Editor cannot take out | Export the AVIF without metadata. |
| larger than the … an image conversion reads | Resize or re-export the picture. |
| a folder is not a file to drop | Drop the files, not the folder. |

If `document.yaml` will not parse, the whole drop stops and says so, rather
than guessing at the threshold and copying in a file you meant to leave where
it is.

## What is never written

Editor holds no path you gave it. A drop is named to the shell by a nonce that
expires after thirty seconds, and every reference written into a chapter is
relative to that chapter and percent-encoded — never a path on this machine.
