# How to connect the production repository

Publishing writes a folder of files into a private git repository and pushes it
with your own git. A static host deploys that repository. This page sets both
up once; after that, publishing is one press.

## Before you start

- A private git repository you can push to from this machine.
- `git` on your path, configured as you normally use it. Editor keeps no
  account and no token: your push works because your configuration works.
- A Cloudflare account, for the Pages project.

## Prepare the repository

Clone the repository somewhere on this machine and leave it on the branch the
host deploys — `main`, unless you choose otherwise. Editor writes into it, adds
exactly the paths it wrote, commits, and pushes; it never resets and never
touches anything else in the working copy.

The first publish lays down what the repository needs:

```
site/                        the deployed directory
  index.html  404.html       the presenter shell, byte for byte the same file
  robots.txt  _headers       Disallow: / and the response headers
  presenter/                 the shell's script and styles, and the deck engine
tools/verify-site.mjs        the checks the workflow runs
.github/workflows/publish.yml
publish-site.json            the base URL and the deployed directory
```

## Tell Editor where to push

Open the settings panel with `C-c C-,` and set the production repository's
path, the remote, the branch, and the site's base URL. These are facts about
this machine, so they are stored in Editor's own configuration file and never
in a document folder. The publish panel, at `C-c C-l`, reads them; it does not
set them.

The remote is a name your repository already declares — `origin`, or whatever
`git remote` lists — never a URL. The base URL is `https`.

## Connect the Pages project

In the Cloudflare dashboard, create a Pages project connected to the private
repository, and set:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `site` |
| Root directory | *(leave empty)* |

There is no build command because the site is committed already built: Editor
is the only thing that writes it, and a build step in the host would be a
second renderer to keep in step with the first.

The repository is private and the site is public. Nothing at the site's root
links to, lists, or names a document: the root, a wrong address and an
unpublished version all render the same empty page.

## What the workflow does

`.github/workflows/publish.yml` runs on a push that touches `site/**` and
reports on what arrived: the not-found page is byte for byte the shell, every
entry at the site root is a reserved name or a well-formed id, every
`latest.json` names a version folder that exists, and no file is over the
host's per-file ceiling. It reports and does not gate the deploy, because
gating would mean deploying from the workflow with a token.

Three further jobs are stubs, each naming the change that fills it in: assets
above the ceiling, the journal PDF, and the access policy for a gated
document.

## Check it once

Publish a document, open the link it hands you on another machine, and read
`publish-log.json` in the document folder: one entry, with the timestamp, the
version hash, the variant, the flag and the links. A document that names no
variant in `document.yaml` reads `default` here — its own single variant,
not a name you chose.
