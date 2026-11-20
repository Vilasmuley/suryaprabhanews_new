const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 12 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isDataHost = url.hostname === 'data.suryaprabhanews.com';

    if (isDataHost) return servePublicAsset(request, env, url);
    if (request.method === 'GET' && url.pathname === '/') return htmlResponse(UPLOAD_PAGE);
    if (request.method === 'POST' && url.pathname === '/api/publish') return publishIssue(request, env, url);
    return new Response('Not found', { status: 404 });
  }
};

async function servePublicAsset(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const key = url.pathname === '/latest.json' ? 'latest.json' : url.pathname.replace(/^\//, '');
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 });
  const object = await env.EPAPER_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404, headers: corsHeaders() });
  const headers = new Headers(corsHeaders());
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', key === 'latest.json' ? 'no-store' : 'public, max-age=31536000, immutable');
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

async function publishIssue(request, env, url) {
  let form;
  try { form = await request.formData(); } catch { return json({ error: 'Upload could not be read.' }, 400); }
  const date = String(form.get('date') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Please select a valid issue date.' }, 400);

  const pages = [];
  for (let number = 1; number <= 8; number++) {
    const file = form.get(`page${number}`);
    if (!(file instanceof File)) return json({ error: `Page ${number} is missing.` }, 400);
    if (!ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_FILE_SIZE) {
      return json({ error: `Page ${number} must be a JPG, PNG, or WebP image smaller than 12 MB.` }, 400);
    }
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const key = `issues/${date}/page${number}.${extension}`;
    await env.EPAPER_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    pages.push({
      number: ['१','२','३','४','५','६','७','८'][number - 1],
      label: ['मुखपृष्ठ','संमिश्र','जिल्हा','संपादकीय','संभाजीनगर','जालना','संमिश्र','शेवटचे पान'][number - 1],
      image: `https://${url.hostname.replace('admin.', 'data.')}/${key}`
    });
  }

  const issue = { date, title: 'दैनिक सूर्यप्रभा', edition: String(form.get('edition') || ''), pages };
  const previous = await env.EPAPER_BUCKET.get('latest.json');
  let existingIssues = [];
  if (previous) {
    try { existingIssues = (await previous.json()).issues || []; } catch { existingIssues = []; }
  }
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const issues = [issue, ...existingIssues.filter(old => old.date !== date && old.date >= cutoffDate)].slice(0, 31);
  const removedIssues = existingIssues.filter(old => !issues.some(kept => kept.date === old.date));
  for (const old of removedIssues) {
    const keys = (old.pages || []).map(page => new URL(page.image).pathname.slice(1));
    if (keys.length) await env.EPAPER_BUCKET.delete(keys);
  }
  const priorSameDay = existingIssues.find(old => old.date === date);
  if (priorSameDay) {
    const newKeys = new Set(pages.map(page => new URL(page.image).pathname.slice(1)));
    const staleKeys = (priorSameDay.pages || []).map(page => new URL(page.image).pathname.slice(1)).filter(key => !newKeys.has(key));
    if (staleKeys.length) await env.EPAPER_BUCKET.delete(staleKeys);
  }
  const latest = { issues };
  await env.EPAPER_BUCKET.put('latest.json', JSON.stringify(latest), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' }
  });
  return json({ ok: true, issue });
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': 'https://suryaprabhanews.com', 'Vary': 'Origin' };
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
function htmlResponse(body) {
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

const UPLOAD_PAGE = `<!doctype html><html lang="mr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>दैनिक सूर्यप्रभा — अंक प्रकाशित करा</title><style>body{margin:0;background:#faf7f4;color:#211;font-family:system-ui,'Noto Sans Devanagari',sans-serif}.box{max-width:700px;margin:48px auto;padding:28px;background:#fff;border:1px solid #eadbd3;border-radius:16px;box-shadow:0 10px 30px #4001}h1{color:#bd161c;margin:0 0 6px}p{color:#655;line-height:1.6}.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}label{display:block;font-weight:700;margin:16px 0 6px}input{width:100%;box-sizing:border-box;padding:11px;border:1px solid #cdbeb6;border-radius:8px;font:inherit}button{margin-top:24px;background:#bd161c;color:#fff;border:0;border-radius:8px;padding:13px 20px;font-weight:800;font:inherit;cursor:pointer}#status{margin-top:18px;font-weight:700}.note{font-size:13px;background:#fff4e9;padding:12px;border-radius:8px}@media(max-width:600px){.box{margin:0;border-radius:0}.row{grid-template-columns:1fr}}</style><main class="box"><h1>आजचा अंक प्रकाशित करा</h1><p>८ पाने क्रमाने निवडा. प्रकाशित केल्यानंतर वाचकांना नवीन अंक दिसेल.</p><form id="form"><div class="row"><div><label>अंकाची तारीख</label><input name="date" type="date" required></div><div><label>वर्ष / अंक (ऐच्छिक)</label><input name="edition" placeholder="वर्ष १७ · अंक ८८"></div></div><div class="note">JPG, PNG किंवा WebP वापरा. प्रत्येक फाइल जास्तीत जास्त 12 MB असावी.</div><div class="row" id="files"></div><button>अंक प्रकाशित करा</button><div id="status" role="status"></div></form></main><script>const f=document.getElementById('form'), list=document.getElementById('files'), status=document.getElementById('status');f.date.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());for(let i=1;i<=8;i++){const l=document.createElement('label');l.innerHTML='पान '+i+'<input type="file" name="page'+i+'" accept="image/jpeg,image/png,image/webp" required>';list.append(l)}f.onsubmit=async e=>{e.preventDefault();if(!confirm('निवडलेली ८ पाने प्रकाशित करायची आहेत का?'))return;status.textContent='अपलोड होत आहे… कृपया पान बंद करू नका.';const r=await fetch('/api/publish',{method:'POST',body:new FormData(f)}),d=await r.json();status.textContent=d.ok?'अंक यशस्वीपणे प्रकाशित झाला.':'त्रुटी: '+(d.error||'पुन्हा प्रयत्न करा.');};</script></html>`;
