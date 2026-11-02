# Worker change: let the Resources page upload to GitHub

The Miscellaneous Resources page (`/miscresources/`) sends uploads, edits and deletes to your Worker.
The Worker checks that the caller is signed in as **Dr. DeMars** (role `teacher`), then commits to the
repo through the GitHub API. GitHub Pages rebuilds a minute or two later and the page shows the new item.

Until you make this change, the page still works for students: it lists whatever is in
`misc-resources.json`. Only the Upload / Edit / Delete buttons fail ("The server did not accept it").

Three new routes:

| Route | Body | What it does |
| --- | --- | --- |
| `POST /api/resources/upload` | multipart form: `meta` (JSON) + `file` | Commits the file into `misc-resources/<folder>/` and adds it to `misc-resources.json` in one commit |
| `POST /api/resources/update` | JSON `{ id, name, courses, categories, description, keywords }` | Rewrites that item in `misc-resources.json` |
| `POST /api/resources/delete` | JSON `{ id }` | Removes the item and deletes its file, in one commit |

All three answer `{ ok: true, item }` (delete answers `{ ok: true }`) or `{ ok: false, message }`.

## Steps

1. **Make a GitHub token.** GitHub → Settings → Developer settings → Personal access tokens →
   *Fine-grained tokens* → Generate new token.
   - Repository access: **Only select repositories** → `derrickdemarsorg.github.io`.
   - Repository permissions: **Contents: Read and write**. Nothing else.
   - Expiration: pick the longest you're comfortable with; set a calendar reminder to renew it.
   Copy the token; GitHub only shows it once.
2. **Store it in the Worker.** dash.cloudflare.com → Workers & Pages → **demars-hub** → Settings →
   Variables and Secrets → Add → type **Secret**, name `GITHUB_TOKEN`, paste the token → Deploy.
3. **Edit the Worker code.** Workers & Pages → demars-hub → **Edit code**.
   - Paste the whole block under **Code to paste** at the bottom of the file.
   - Find where the Worker routes requests (the part that checks `url.pathname` for `/api/login`,
     `/api/file/...`, `/api/calendar`, and so on). Add this line near the top of that list:
     ```js
     if (url.pathname.startsWith('/api/resources/')) return handleResources(request, env, url);
     ```
   - Find your existing token check (the one `/api/refresh` and `POST /api/file/...` use to read the
     `Authorization: Bearer ...` header and work out the role). Fill in `resourcesRole()` in the pasted
     block so it calls that function and returns the role string (`'teacher'`, `'staff'`, `'sub'`) or
     `null`. It's the only line you need to adapt.
   - If your Worker adds CORS headers through a helper, wrap the responses the same way, or leave the
     small `rJson()` helper below as is: it allows `https://derrickdemars.org` only.
4. Click **Deploy**.
5. Open https://derrickdemars.org/miscresources/, sign in with your PIN, click Upload, and upload a
   small PDF. The button shows a spinner while the Worker commits and while GitHub Pages rebuilds
   (usually 1–3 minutes). When the item appears, the modal closes and the row flashes. Check the repo:
   you should see one commit "Upload: <name>" that added the file and changed `misc-resources.json`.

## Limits worth knowing

- The page refuses files over **95 MB** (GitHub's hard limit is 100 MB) and warns above 25 MB.
- The Worker has 128 MB of memory, and a file has to be turned into base64 text (about 1.4× its size)
  to go through the GitHub API. In practice uploads up to roughly **40 MB** are safe; a 95 MB video may
  fail with a memory error. For big videos, upload to YouTube or Drive and link them later.
- Edits and deletes don't change the file's name or folder. To move a file, delete and re-upload.
- Every upload is one commit on `main`. The commit history is your audit log.

## Code to paste

```js
// ===== Teaching Hub resources: upload / update / delete via the GitHub API (paste at the bottom) =====
const RES_REPO = { owner: 'derrickdemars', repo: 'derrickdemarsorg.github.io', branch: 'main' };
const RES_LIST = 'misc-resources.json';
const RES_ORIGIN = 'https://derrickdemars.org';
const RES_MAX_BYTES = 95 * 1024 * 1024;
const RES_COURSES = ['g7', 'g8', 'alg1', 'geo', 'alg2', 'alg3'];
const RES_CATS = { ws: 'worksheets', media: 'images-videos', inter: 'interactives' };
const RES_TYPES = { pdf: 'PDF', png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image', webp: 'Image', svg: 'Image', bmp: 'Image', heic: 'Image',
  mp4: 'Video', webm: 'Video', mov: 'Video', m4v: 'Video', mkv: 'Video', mp3: 'Audio', wav: 'Audio', m4a: 'Audio', ogg: 'Audio', aac: 'Audio', flac: 'Audio',
  html: 'HTML', htm: 'HTML', tex: 'TeX', zip: 'ZIP' };

// >>> ADAPT THIS ONE FUNCTION. Return the signed-in role ('teacher' | 'staff' | 'sub') or null,
// using the same check your Worker already does for /api/refresh and POST /api/file/...
async function resourcesRole(request, env) {
  // Example, if your Worker has something like `verifyToken(request, env)` that returns { role }:
  // const s = await verifyToken(request, env); return s ? s.role : null;
  return null;
}

function rJson(data, status) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: {
    'Content-Type': 'application/json', 'Access-Control-Allow-Origin': RES_ORIGIN, 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
}

async function handleResources(request, env, url) {
  if (request.method === 'OPTIONS') return rJson({ ok: true }, 204);
  if (request.method !== 'POST') return rJson({ ok: false, message: 'Use POST.' }, 405);
  if (!env.GITHUB_TOKEN) return rJson({ ok: false, message: 'The Worker has no GITHUB_TOKEN secret yet.' }, 500);
  const role = await resourcesRole(request, env);
  if (role !== 'teacher') return rJson({ ok: false, message: 'Only Dr. DeMars can change resources.' }, role ? 403 : 401);
  try {
    const action = url.pathname.replace('/api/resources/', '');
    if (action === 'upload') return rJson(await resUpload(request, env));
    if (action === 'update') return rJson(await resUpdate(await request.json(), env));
    if (action === 'delete') return rJson(await resDelete(await request.json(), env));
    return rJson({ ok: false, message: 'Unknown resources action.' }, 404);
  } catch (e) {
    return rJson({ ok: false, message: 'GitHub said: ' + (e && e.message || e) }, 500);
  }
}

// ---- validation helpers ----
function resClean(meta, existing) {
  const name = String(meta.name || '').trim().slice(0, 120);
  const courses = [...new Set((meta.courses || []).filter(c => RES_COURSES.includes(c)))];
  const categories = [...new Set((meta.categories || []).filter(c => c in RES_CATS))];
  if (!name) throw new Error('Give it a name.');
  if (!courses.length) throw new Error('Pick at least one class.');
  if (!categories.length) throw new Error('Pick at least one category.');
  return { ...existing, name, courses, categories,
    description: String(meta.description || '').trim().slice(0, 200),
    keywords: [...new Set((meta.keywords || []).map(k => String(k).trim().toLowerCase()).filter(Boolean))].slice(0, 40) };
}
function resSlug(filename) {
  const m = /\.([A-Za-z0-9]+)$/.exec(filename || ''), ext = m ? m[1].toLowerCase() : '';
  let base = String(filename || '').replace(/\.[A-Za-z0-9]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file';
  return { base, ext };
}
function resType(path) { const m = /\.([A-Za-z0-9]+)$/.exec(path); return (m && RES_TYPES[m[1].toLowerCase()]) || 'Other'; }
function resId() { const b = crypto.getRandomValues(new Uint8Array(6)); return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }
function resNow() { return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
function toBase64(buf) {
  const bytes = new Uint8Array(buf); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function utf8Base64(str) { return toBase64(new TextEncoder().encode(str)); }
function fromUtf8Base64(b64) { return new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0))); }

// ---- GitHub API ----
async function gh(env, method, path, body) {
  const r = await fetch('https://api.github.com/repos/' + RES_REPO.owner + '/' + RES_REPO.repo + path, {
    method, headers: { 'Authorization': 'Bearer ' + env.GITHUB_TOKEN, 'Accept': 'application/vnd.github+json', 'User-Agent': 'demars-hub-worker',
      'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  if (r.status === 404 && method === 'GET') return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d && d.message) || ('HTTP ' + r.status));
  return d;
}
async function resReadList(env) {
  const f = await gh(env, 'GET', '/contents/' + RES_LIST + '?ref=' + RES_REPO.branch);
  const data = f ? JSON.parse(fromUtf8Base64(f.content)) : { items: [] };
  if (!Array.isArray(data.items)) data.items = [];
  return { data, sha: f ? f.sha : null };
}
async function resExists(env, path) { return !!(await gh(env, 'GET', '/contents/' + path + '?ref=' + RES_REPO.branch)); }
// One commit that writes several paths. entries: [{ path, base64 }] to add/replace, [{ path, remove: true }] to delete.
async function resCommit(env, message, entries) {
  const ref = await gh(env, 'GET', '/git/ref/heads/' + RES_REPO.branch);
  const head = ref.object.sha;
  const commit = await gh(env, 'GET', '/git/commits/' + head);
  const tree = [];
  for (const e of entries) {
    if (e.remove) { tree.push({ path: e.path, mode: '100644', type: 'blob', sha: null }); continue; }
    const blob = await gh(env, 'POST', '/git/blobs', { content: e.base64, encoding: 'base64' });
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const newTree = await gh(env, 'POST', '/git/trees', { base_tree: commit.tree.sha, tree });
  const newCommit = await gh(env, 'POST', '/git/commits', { message, tree: newTree.sha, parents: [head] });
  await gh(env, 'PATCH', '/git/refs/heads/' + RES_REPO.branch, { sha: newCommit.sha, force: false });
  return newCommit.sha;
}
function resListJson(data) { return JSON.stringify({ items: data.items }, null, 2) + '\n'; }

// ---- the three actions ----
async function resUpload(request, env) {
  const form = await request.formData();
  const file = form.get('file');
  let meta; try { meta = JSON.parse(form.get('meta') || '{}'); } catch (e) { throw new Error('Bad form data.'); }
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('No file was sent.');
  if (file.size > RES_MAX_BYTES) throw new Error('That file is over 95 MB.');
  if (!file.size) throw new Error('That file is empty.');
  const item = resClean(meta, { id: resId(), uploaded: resNow() });
  item.updated = item.uploaded;
  const folder = RES_CATS[item.categories[0]], { base, ext } = resSlug(file.name);
  let path = 'misc-resources/' + folder + '/' + base + (ext ? '.' + ext : '');
  for (let n = 2; n < 50 && await resExists(env, path); n++) path = 'misc-resources/' + folder + '/' + base + '-' + n + (ext ? '.' + ext : '');
  item.file = path; item.size = file.size; item.type = resType(path);
  const { data } = await resReadList(env);
  data.items.push(item);
  await resCommit(env, 'Upload: ' + item.name + ' (' + item.courses.join(', ') + ')', [
    { path, base64: toBase64(await file.arrayBuffer()) },
    { path: RES_LIST, base64: utf8Base64(resListJson(data)) }
  ]);
  return { ok: true, item };
}
async function resUpdate(meta, env) {
  const { data, sha } = await resReadList(env);
  const i = data.items.findIndex(x => x.id === meta.id);
  if (i < 0) throw new Error('That item is not in the list any more.');
  const item = resClean(meta, data.items[i]); item.updated = resNow();
  data.items[i] = item;
  await gh(env, 'PUT', '/contents/' + RES_LIST, { message: 'Edit resource: ' + item.name, content: utf8Base64(resListJson(data)), sha, branch: RES_REPO.branch });
  return { ok: true, item };
}
async function resDelete(meta, env) {
  const { data } = await resReadList(env);
  const item = data.items.find(x => x.id === meta.id);
  if (!item) throw new Error('That item is not in the list any more.');
  data.items = data.items.filter(x => x.id !== meta.id);
  const stillUsed = data.items.some(x => x.file === item.file);
  const entries = [{ path: RES_LIST, base64: utf8Base64(resListJson(data)) }];
  if (!stillUsed && /^misc-resources\/(worksheets|images-videos|interactives)\/[^/]+$/.test(item.file) && await resExists(env, item.file)) entries.push({ path: item.file, remove: true });
  await resCommit(env, 'Delete resource: ' + item.name, entries);
  return { ok: true };
}
// ===== end resources block =====
```
