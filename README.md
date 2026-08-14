# Murgatroyd Opticians blog — how this works

This is a free, self-hosted blog built with Jekyll, hosted on GitHub Pages.
It costs nothing to run, forever, as long as it stays within GitHub's free
tier (way more capacity than a monthly blog needs).

## One-time setup (see the step-by-step walkthrough for full detail)

1. Create a GitHub account (free).
2. Create a new repository and upload these files.
3. Turn on GitHub Pages for that repository.
4. Add the custom domain `blog.murgatroydopticians.co.uk` in the Pages settings.
5. Whoever controls DNS for murgatroydopticians.co.uk adds one CNAME record
   pointing `blog` at `<your-github-username>.github.io`.
6. Wait for GitHub to issue the HTTPS certificate (automatic, can take up to
   24 hours the first time).

## Publishing a post each month

1. Go to the `_posts` folder in the GitHub repository.
2. Duplicate `2026-08-17-welcome-to-our-blog.md` (or the most recent post).
3. Rename the file: date first (`YYYY-MM-DD-`), then a short hyphenated title,
   ending `.md` — e.g. `2026-09-10-back-to-school-eye-tests.md`.
4. Edit the top section (between the two `---` lines):
   - `title` — the post headline
   - `branch` — "Conisbrough", "Staveley", or "Both practices"
5. Write the post body underneath in plain text.
6. Save / commit the change directly in GitHub's website — no software
   needed. The site rebuilds itself automatically, usually within a minute.

## Restyling later

All colours and fonts are set as six variables at the top of
`assets/css/style.css`. Once full brand guidelines are confirmed, update
those six lines and the whole site restyles in one go.

## Note on the font

Gill Sans isn't a free web font, so this uses **Jost**, a free
geometric sans-serif that's the closest visual match available via
Google Fonts. If Wigwam already has a licensed web version of Gill Sans
for the main site, swap the font-family names in style.css to match it.
