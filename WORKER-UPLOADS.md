# Worker change: let the Resources page upload to GitHub

The Miscellaneous Resources page (`/miscresources/`) uploads, edits and deletes through the
**demars-hub** Worker. The Worker checks that you're signed in as Dr. DeMars, then commits to this repo
through the GitHub API. GitHub Pages rebuilds 1–3 minutes later and the page shows the change.

Until this is set up, students still see everything in `misc-resources.json`; only Upload, Edit and
Delete fail, with a message saying the Worker has no `GITHUB_TOKEN` yet.

## Part 1. Make a GitHub token (about 3 minutes)

1. Sign in at https://github.com as **derrickdemars**.
2. Click your profile picture (top right) → **Settings**.
3. In the left sidebar, scroll to the very bottom → **Developer settings**.
4. Left sidebar → **Personal access tokens** → **Fine-grained tokens**.
5. Click **Generate new token** (confirm your password or 2FA if asked).
6. Fill in the form:
   - **Token name:** `demars-hub resources`
   - **Expiration:** **Custom** → pick a date up to a year away. Put a reminder in your calendar a week
     before it, titled "Renew demars-hub GitHub token".
   - **Resource owner:** derrickdemars
   - **Repository access:** **Only select repositories** → choose `derrickdemarsorg.github.io`.
   - **Permissions:** click **Add permissions** (or open **Repository permissions**) → find
     **Contents** → set it to **Read and write**. (GitHub adds **Metadata: Read-only** by itself; that's
     expected.) Leave everything else at No access.
7. Click **Generate token** at the bottom, then **copy** the token (it starts with `github_pat_`).
   GitHub shows it only once. Keep this tab open until Part 2 is done.

## Part 2. Give the token to the Worker (about 2 minutes)

1. Go to https://dash.cloudflare.com and sign in.
2. Left sidebar → **Compute (Workers)** → **Workers & Pages** (older dashboards just say
   **Workers & Pages**).
3. Click **demars-hub**.
4. Top tabs → **Settings** → **Variables and Secrets** → **+ Add**.
5. **Type:** Secret. **Variable name:** `GITHUB_TOKEN` (exactly, all capitals). **Value:** paste the
   token. Click **Deploy**.
6. While you're on this screen, look for **ALLOWED_ORIGINS** in the list. Its value should include
   `https://derrickdemars.org`. It already does if sign-in works on the site; leave it alone.

## Part 3. Replace the Worker code (about 2 minutes)

1. Still on **demars-hub**, click **Edit code** (top right; on some dashboards it's a **</>** icon).
2. Click anywhere in the code, press **Ctrl+A** (select all), then **Delete**. The editor is now empty.
3. Open the file **worker.js** from this update, select all of it, copy, and paste it into the editor.
4. Check the first line reads `// DeMars Math Hub — protected API` and the last line is the closing `}`
   of `resDelete`.
5. Click **Deploy** (top right). Wait for "Deployed" or a green check.

worker.js is your current Worker plus 175 added lines. Nothing was removed or changed: sign-in,
protected files, the planner, the calendar and the calendar feed all work as before.

## Part 4. Test it

1. Open https://demars-hub.derrickdemars.workers.dev/api/health in a browser. It should show
   `{"ok":true}`.
2. Open https://derrickdemars.org/miscresources/ and click **Upload**. Enter your PIN.
3. Pick a small PDF, one class, one category, and click **Upload**. The button spins and its label goes:
   *Preparing the file… → Sending the file to GitHub… → Saving it to the site… → Committed. Waiting
   for GitHub Pages to publish it…* After 1–3 minutes the modal closes, "Uploaded." appears, and the new
   row flashes.
4. On GitHub, open the repo's **commits** list. The newest commit is "Upload: <name> (<classes>)" and
   it adds the file under `misc-resources/<folder>/` and changes `misc-resources.json`.
5. Try **Edit** (rename it) and **Delete** on that test item. Each makes one commit.

## If something goes wrong

| What the page says | What to do |
| --- | --- |
| The Worker has no GITHUB_TOKEN secret yet | Part 2 wasn't saved. Check the name is exactly `GITHUB_TOKEN` and click Deploy. |
| GitHub rejected the GITHUB_TOKEN (it may have expired) | Make a new token (Part 1) and replace the secret's value (Part 2). |
| GitHub said "Resource not accessible…" / "Not Found" | The token is missing **Contents: Read and write**, or isn't limited to `derrickdemarsorg.github.io`. Edit the token on GitHub. |
| The repo changed at the same moment | Two commits collided (e.g. you uploaded files on GitHub at the same time). Click Upload again. |
| It committed, but GitHub Pages has not rebuilt yet | Nothing is wrong. Reload the page in a minute. Repo → **Actions** shows the Pages build. |
| Only Dr. DeMars can change resources | You're signed in as Staff or a substitute. Sign out and sign in with your PIN. |
| Can't reach the server | Check the internet connection, then open the `/api/health` link above. |

## Limits worth knowing

- **70 MB per file.** The browser turns the file into base64 text, which is a third larger, and
  Cloudflare refuses requests over 100 MB. Files over 25 MB get a warning because they're slow for
  students to open on Chromebooks. For big videos, post them on YouTube or Drive.
- **Free plan friendly.** Cloudflare's free plan allows about 10 ms of Worker CPU per request. The
  Worker never reads the file itself; it streams it straight to GitHub, so file size doesn't matter
  for CPU.
- **Repo size.** GitHub Pages sites should stay under about 1 GB in total. A few dozen videos will get
  you there, which is another reason to keep videos on YouTube or Drive.
- Edits change the name, classes, categories, description and keywords, not the file. To replace a
  file, delete it and upload the new one.
- Every change is one commit on `main`, so the commit history is a full record and anything can be
  restored from it.

## How it works (for reference)

| Route | Body | Result |
| --- | --- | --- |
| `POST /api/resources/blob` | `{"encoding":"base64","content":"…"}`, built by the browser | Streamed to GitHub's blob API → `{ ok, sha }` |
| `POST /api/resources/upload` | `{ meta, sha, filename, size }` | One commit: the file + its `misc-resources.json` entry → `{ ok, item }` |
| `POST /api/resources/update` | `{ id, name, courses, categories, description, keywords }` | One commit to `misc-resources.json` → `{ ok, item }` |
| `POST /api/resources/delete` | `{ id }` | One commit removing the entry and its file → `{ ok }` |

All four require a Dr. DeMars sign-in token. Staff and substitute tokens get "Only Dr. DeMars can
change resources."
