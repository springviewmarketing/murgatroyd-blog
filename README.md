# Murgatroyd Opticians blog

Static site served from GitHub Pages at <https://blog.murgatroydopticians.co.uk>.
Pages are generated from plain text files, so the finished HTML never has to be
edited by hand.

## Files

```
content/            one plain text file per post - EDIT THESE
posts/              generated pages - never edit by hand
index.html          the listing page
assets/css/blog.css the only stylesheet
assets/img/         images used on the site
incoming/           drop original photographs here before preparing them
tools/build.js      builds posts/ and the listing from content/
tools/prepare-images.js  shrinks photographs for the web
CNAME               the custom domain - do not delete
.nojekyll           serve the files as they are - do not delete
```

The rule that matters: **`content/` is the source of truth.** Anything in
`posts/` is regenerated on every build and hand edits are lost.

## Publishing a post

**1. Prepare the photographs.** Put the originals in `incoming/`, then run:

```bash
node tools/prepare-images.js
```

Open the address it prints. Finished images appear in `assets/img/` at 1600px
wide with tidied file names, usually 200 to 400KB. Originals are left alone,
so empty `incoming/` afterwards.

**2. Write the post.** Create `content/your-post-name.md`. Copy an existing
file to see the shape of it. The details at the top, then `---`, then the
article using `##` for each question heading and a blank line between
paragraphs.

**3. Build.**

```bash
node tools/build.js
```

This writes the post page, rebuilds the listing newest first, and checks the
post against house style. It stops and tells you if something is wrong.

**4. Upload.** Drag the changed files onto GitHub. Normally that is
`index.html` and the `posts` folder, plus `assets` if you added images.
Drag folders as folders, not their contents.

## Why it is generated rather than hand written

Each post carries hidden mark-up telling Google what the page is and what
questions it answers. That mark-up has to match the visible words exactly,
or Google treats it as misleading. Generating both from one source means
they cannot fall out of step.

## House style

- around 2,000 words, continuous prose
- no bullet points, numbered lists or bold text in the body
- headings phrased as questions, answered in the first sentence or two
- British English, "patients" rather than customers or clients
- no em dashes, the build will refuse to finish if it finds one
- a genuine FAQ section at the end
- descriptive link text, never "click here"
- every health claim checked against a real source before writing

## Images

Use the practice's own photography, never stock or AI generated. Landscape
suits the header. Always write a real description in `image-alt`, since that
is what screen readers announce and what search engines read.

## Changing the look

Everything visual is in `assets/css/blog.css`. The colours are set at the top
and match the main website:

| Colour | Hex | Used for |
| --- | --- | --- |
| Navy | `#003366` | header, footer, body text |
| Teal | `#33cccc` | navigation bar, accent rules |
| Grey | `#cccccc` | page background behind the white shell |

The header, navigation and footer appear in two places: `tools/build.js` for
post pages, and `index.html` for the listing. Change both together.
