# Murgatroyd Opticians blog

Plain HTML site served from GitHub Pages at <https://blog.murgatroydopticians.co.uk>.
No build step, no Jekyll, no dependencies. What you commit is exactly what gets served.

## Files

```
index.html                  the blog listing page
_post-template.html         blank starting point for a new post (not published)
posts/                      one HTML file per post
assets/css/blog.css         the only stylesheet, used by every page
assets/img/                 logos, header photos, post thumbnails
CNAME                       the custom domain, do not delete
.nojekyll                   tells GitHub Pages to serve the files as they are
```

## Publishing a new post

Two edits, every time.

**1. Create the post**

Copy `_post-template.html` into `posts/` and rename it to something descriptive in
lower case with hyphens, for example `posts/dry-eyes-in-winter.html`. The filename
becomes the web address, so it is worth getting right.

Open it and work through the ten places marked `EDIT`. The first five are all in the
head section at the top and cover the page title, the search description, the web
address and the social sharing preview. Write the body using `<h2>` for each question
heading and `<p>` for each paragraph. Leave the header, navigation and footer alone.

Delete the `<meta name="robots" content="noindex">` line. It exists only to keep the
blank template out of Google, and leaving it in would hide your post too.

If the post has an FAQ section and you want it eligible for the expandable answers
Google sometimes shows, copy the `FAQPage` block from
`posts/childrens-eye-test-before-school.html` and update the questions to match.
Only include it if the questions and answers match the article word for word,
otherwise leave it out.

**2. Add it to the listing**

Open `index.html` and find the block marked `===== POST CARD =====`. Copy the whole
`<article class="post-card">` block, paste the copy directly above the original so the
newest post sits at the top, and change the five numbered items inside it: thumbnail,
date, title and link, summary, and the read more link.

Commit both files. GitHub Pages republishes in a minute or two.

## House style reminders

The posts follow the Spring View Marketing standard, so when writing:

- around 2,000 words, continuous prose
- no bullet points, numbered lists or bold text inside the body copy
- headings phrased as questions, answered directly in the first sentence or two
- British English, "patients" rather than customers or clients
- no em dashes
- a genuine FAQ section at the end
- descriptive link text, never "click here"
- every health claim or statistic checked against a real source before it goes in

## Images

Use the practice's own photography. Landscape images work best for the header, and
anything around 1200 pixels wide is plenty. Put the file in `assets/img/` and always
write a real description in the `alt` text, since that is what screen readers announce
and what search engines read.

## Changing the look

Everything visual lives in `assets/css/blog.css`. The colours are set at the top of
that file and match the main website:

| Colour | Hex | Used for |
| --- | --- | --- |
| Navy | `#003366` | header, footer, body text |
| Teal | `#33cccc` | navigation bar, accent rules |
| Grey | `#cccccc` | page background behind the white shell |

Change a value there and it updates across every page.
