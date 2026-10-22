'use strict';
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const API_HOST = 'drive-pc.quark.cn';
const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const OSS_PART_UA = 'aliyun-sdk-js/1.0.0 Chrome Mobile 139.0.0.0 on Google Nexus 5 (Android 6.0)';
const OSS_DONE_UA = 'aliyun-sdk-js/1.0.0 Chrome 139.0.0.0 on OS X 10.15.7 64-bit';
const CHUNK = 4 * 1024 * 1024;

const NOT_LOGGED = [31001, 31004, 46001, 46002];

function api(cookie, method, apiPath, payload, extraQuery) {
  let qs = 'pr=ucpro&fr=pc&uc_param_str=';
  if (extraQuery) qs += '&' + extraQuery;
  return new Promise((resolve, reject) => {
    const body = payload === undefined || payload === null ? null : JSON.stringify(payload);
    const headers = {
      Cookie: cookie,
      'User-Agent': PC_UA,
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json;charset=UTF-8',
      Origin: 'https://pan.quark.cn',
      Referer: 'https://pan.quark.cn/',
    };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request({ host: API_HOST, method, path: apiPath + '?' + qs, headers, timeout: 40000 }, (res) => {
      const bufs = [];
      res.on('data', (c) => bufs.push(c));
      res.on('end', () => {
        const text = Buffer.concat(bufs).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (e) { /* 非 JSON 走下面报错 */ }
        if (!json) return reject(new Error(`夸克接口 ${apiPath} 返回非 JSON（HTTP ${res.statusCode}）：${text.slice(0, 150)}`));
        resolve(json);
      });
    });
    req.on('error', (e) => reject(new Error(`夸克接口 ${apiPath} 网络错误：${e.message}`)));
    req.on('timeout', () => req.destroy(new Error(`夸克接口 ${apiPath} 超时`)));
    if (body) req.write(body);
    req.end();
  });
}

function unwrap(json, apiPath) {
  const code = Number(json && json.code);
  if (code === 0) return json.data || {};
  const msg = String((json && json.message) || '未知错误');
  if (NOT_LOGGED.indexOf(code) >= 0) throw new Error('未登录夸克网盘（code=' + code + '），请重新登录或粘贴 Cookie');
  throw new Error(`夸克接口 ${apiPath} 失败：code=${code} ${msg}（req_id=${(json && json.req_id) || ''}）`);
}

function ossRequest(host, method, fullPath, headers, body, bodyLength) {
  return new Promise((resolve, reject) => {
    const h = Object.assign({ Host: host, 'Content-Length': String(bodyLength) }, headers);
    const req = https.request({ host, method, path: fullPath, headers: h, timeout: 300000 }, (res) => {
      const bufs = [];
      res.on('data', (c) => bufs.push(c));
      res.on('end', () => {
        const text = Buffer.concat(bufs).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ etag: String(res.headers.etag || '').replace(/"/g, ''), text });
        } else {
          reject(new Error(`夸克存储 HTTP ${res.statusCode}：${text.slice(0, 300)}`));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`夸克存储网络错误：${e.message}`)));
    req.on('timeout', () => req.destroy(new Error('夸克存储上传超时')));
    if (Buffer.isBuffer(body)) { req.end(body); return; }
    body.pipe(req);
  });
}

function ossDate() { return new Date().toUTCString(); }

function partAuthMeta(bucket, objKey, uploadId, partNumber, mime, date, hashCtx, ua) {
  const lines = ['PUT', '', mime, date, 'x-oss-date:' + date];
  if (hashCtx) lines.push('x-oss-hash-ctx:' + hashCtx);
  lines.push('x-oss-user-agent:' + ua);
  lines.push('/' + bucket + '/' + objKey + '?partNumber=' + partNumber + '&uploadId=' + uploadId);
  return lines.join('\n');
}

function completeXml(etags) {
  const parts = etags.map((e, i) => `<Part><PartNumber>${i + 1}</PartNumber><ETag>"${e}"</ETag></Part>`).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<CompleteMultipartUpload>\n' + parts + '\n</CompleteMultipartUpload>';
}

function completeAuthMeta(bucket, objKey, uploadId, xml, callback, date, ua) {
  const xmlMd5 = crypto.createHash('md5').update(xml, 'utf8').digest('base64');
  const cb = Buffer.from(JSON.stringify(callback || {}), 'utf8').toString('base64');
  return [
    'POST', xmlMd5, 'application/xml', date,
    'x-oss-callback:' + cb,
    'x-oss-date:' + date,
    'x-oss-user-agent:' + ua,
    '/' + bucket + '/' + objKey + '?uploadId=' + uploadId,
  ].join('\n');
}

function sha1Blocks(st, buf, len) {
  let h0 = st[0], h1 = st[1], h2 = st[2], h3 = st[3], h4 = st[4];
  const w = new Int32Array(80);
  for (let i = 0; i + 64 <= len; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = buf.readUInt32BE(i + t * 4);
    for (let t = 16; t < 80; t++) {
      const v = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
      w[t] = (v << 1) | (v >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let t = 0; t < 80; t++) {
      let f, k;
      if (t < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (t < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      const tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) | 0;
      e = d; d = c;
      c = (b << 30) | (b >>> 2);
      b = a; a = tmp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  return [h0 >>> 0, h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function encodeHashCtx(st, bits) {
  return Buffer.from(JSON.stringify({
    hash_type: 'sha1', h0: String(st[0]), h1: String(st[1]), h2: String(st[2]),
    h3: String(st[3]), h4: String(st[4]), Nl: String(bits), Nh: '0', data: '', num: '0',
  }), 'utf8').toString('base64');
}

// 一遍扫完：md5/sha1 供 pre+秒传判断，每 4MB 的 sha1 中间状态供分片 x-oss-hash-ctx
function fileDigests(filePath) {
  const md5 = crypto.createHash('md5');
  const sha1 = crypto.createHash('sha1');
  let st = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
  const contexts = [];
  let bits = 0;
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(CHUNK);
    let pos = 0;
    for (;;) {
      const n = fs.readSync(fd, buf, 0, CHUNK, pos);
      if (!n) break;
      pos += n;
      const chunk = buf.subarray(0, n);
      md5.update(chunk);
      sha1.update(chunk);
      const full = n - (n % 64);
      if (full) st = sha1Blocks(st, chunk, full);
      bits += n * 8;
      contexts.push(encodeHashCtx(st, bits));
    }
  } finally {
    fs.closeSync(fd);
  }
  contexts.pop();
  return { md5: md5.digest('hex'), sha1: sha1.digest('hex'), contexts };
}

function mimeByName(name) {
  const ext = path.extname(String(name)).toLowerCase();
  const map = {
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

async function listDir(cookie, pdirFid) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const data = unwrap(await api(cookie, 'GET', '/1/clouddrive/file/sort', undefined,
      `pdir_fid=${encodeURIComponent(pdirFid)}&_page=${page}&_size=100&_fetch_total=1&_fetch_sub_dirs=1&_sort=file_type:asc,updated_at:desc`), '/file/sort');
    const list = Array.isArray(data.list) ? data.list : [];
    for (const it of list) {
      out.push({
        fid: String(it.fid || ''),
        name: String(it.file_name || it.title || ''),
        dir: !!it.dir,
        size: Number(it.size || 0),
        updated_at: Number(it.updated_at || 0),
      });
    }
    if (list.length < 100) break;
  }
  return out;
}

async function checkCookie(cookie) {
  const items = await listDir(cookie, '0');
  return { ok: true, rootCount: items.length };
}

async function mkdir(cookie, pdirFid, name) {
  const data = unwrap(await api(cookie, 'POST', '/1/clouddrive/file', {
    pdir_fid: pdirFid, file_name: name, dir_init_lock: false, dir_path: '',
  }), '/file');
  const fid = String(data.fid || '');
  if (!fid) throw new Error('夸克建目录未返回 fid：' + JSON.stringify(data).slice(0, 200));
  return fid;
}

async function ensurePath(cookie, posixPath, create) {
  const segments = String(posixPath || '/').split('/').map(s => s.trim()).filter(s => s && s !== '.');
  let fid = '0';
  const walked = [];
  for (const seg of segments) {
    if (seg.indexOf('..') >= 0) throw new Error('网盘路径不允许 ..');
    const items = await listDir(cookie, fid);
    const hit = items.find(it => it.dir && it.name === seg);
    if (hit) { fid = hit.fid; walked.push(seg); continue; }
    if (!create) throw new Error(`网盘路径不存在：/${walked.join('/')}（缺少「${seg}」）`);
    fid = await mkdir(cookie, fid, seg);
    walked.push(seg);
  }
  return { fid, path: '/' + walked.join('/') };
}

async function pollTaskFid(cookie, taskId) {
  for (let i = 0; i < 10; i++) {
    const data = unwrap(await api(cookie, 'GET', '/1/clouddrive/task', undefined,
      `task_id=${encodeURIComponent(taskId)}&retry_index=${i}`), '/task');
    if (data && data.fid) return String(data.fid);
    if (data && (data.finish === true || data.status === 2)) return '';
    await new Promise(r => setTimeout(r, 1500));
  }
  return '';
}

// 上传单个文件到指定目录 fid；onProgress({phase,part,total,name})
async function uploadFile(cookie, filePath, pdirFid, onProgress) {
  const report = typeof onProgress === 'function' ? onProgress : () => {};
  const name = path.basename(filePath);
  const size = fs.statSync(filePath).size;
  const mime = mimeByName(name);
  const now = Date.now();

  report({ phase: 'hash', name });
  const dg = fileDigests(filePath);

  const pre = unwrap(await api(cookie, 'POST', '/1/clouddrive/file/upload/pre', {
    ccp_hash_update: true,
    parallel_upload: true,
    pdir_fid: pdirFid,
    dir_name: '',
    size,
    file_name: name,
    format_type: mime,
    l_updated_at: now,
    l_created_at: now,
  }), '/upload/pre');

  const taskId = String(pre.task_id || '');
  const uploadId = String(pre.upload_id || '');
  const objKey = String(pre.obj_key || '');
  const bucket = String(pre.bucket || 'ul-zb');
  const authInfo = pre.auth_info || '';
  const callback = pre.callback || {};
  if (!taskId) throw new Error('夸克 pre 未返回 task_id：' + JSON.stringify(pre).slice(0, 200));

  const hashRes = unwrap(await api(cookie, 'POST', '/1/clouddrive/file/update/hash', {
    task_id: taskId, md5: dg.md5, sha1: dg.sha1,
  }), '/update/hash');

  const host = bucket + '.pds.quark.cn';
  const authKeyOf = async (authMeta) => {
    const d = unwrap(await api(cookie, 'POST', '/1/clouddrive/file/upload/auth', {
      task_id: taskId, auth_info: authInfo, auth_meta: authMeta,
    }), '/upload/auth');
    const ak = String(d.auth_key || '');
    if (!ak) throw new Error('夸克未返回 auth_key：' + JSON.stringify(d).slice(0, 200));
    return ak;
  };

  let instant = false;
  if (hashRes && hashRes.finish === true) {
    instant = true;
    report({ phase: 'instant', name });
  }

  if (!instant) {
    if (!uploadId || !objKey) throw new Error('夸克 pre 未返回 upload_id/obj_key，无法上传');
    const total = Math.max(1, Math.ceil(size / CHUNK));
    const etags = [];
    for (let pn = 1; pn <= total; pn++) {
      const offset = (pn - 1) * CHUNK;
      const partSize = Math.min(CHUNK, size - offset);
      const hashCtx = pn > 1 ? String(dg.contexts[pn - 2] || '') : '';
      const date = ossDate();
      const meta = partAuthMeta(bucket, objKey, uploadId, pn, mime, date, hashCtx, OSS_PART_UA);
      const ak = await authKeyOf(meta);
      const headers = {
        'Content-Type': mime,
        'x-oss-date': date,
        'x-oss-user-agent': OSS_PART_UA,
        authorization: ak,
      };
      if (hashCtx) headers['x-oss-hash-ctx'] = hashCtx;
      const stream = fs.createReadStream(filePath, { start: offset, end: offset + partSize - 1 });
      const r = await ossRequest(host, 'PUT',
        `/${objKey}?partNumber=${pn}&uploadId=${encodeURIComponent(uploadId)}`, headers, stream, partSize);
      etags.push(r.etag);
      report({ phase: 'part', part: pn, total, name });
    }

    const xml = completeXml(etags);
    const xmlBuf = Buffer.from(xml, 'utf8');
    const date2 = ossDate();
    const meta2 = completeAuthMeta(bucket, objKey, uploadId, xml, callback, date2, OSS_DONE_UA);
    const ak2 = await authKeyOf(meta2);
    await ossRequest(host, 'POST', `/${objKey}?uploadId=${encodeURIComponent(uploadId)}`, {
      'Content-Type': 'application/xml',
      'x-oss-date': date2,
      'x-oss-user-agent': OSS_DONE_UA,
      'x-oss-callback': Buffer.from(JSON.stringify(callback || {}), 'utf8').toString('base64'),
      'Content-MD5': crypto.createHash('md5').update(xmlBuf).digest('base64'),
      authorization: ak2,
    }, xmlBuf, xmlBuf.length);
    report({ phase: 'complete', name });
  }

  const finish = unwrap(await api(cookie, 'POST', '/1/clouddrive/file/upload/finish',
    objKey ? { task_id: taskId, obj_key: objKey } : { task_id: taskId }), '/upload/finish');
  let fid = String((finish && finish.fid) || '');
  if (!fid && finish && finish.task_id) fid = await pollTaskFid(cookie, String(finish.task_id));

  if (!instant) {
    const items = await listDir(cookie, pdirFid);
    const hit = items.find(it => !it.dir && it.name === name);
    if (!hit) throw new Error(`夸克返回成功但目录里找不到「${name}」，请检查网盘是否被风控`);
    return { fid: hit.fid, name, size, instant: false };
  }
  return { fid, name, size, instant: true };
}

function createZip(zipPath, entries, onProgress) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on('close', () => resolve({ file: zipPath, bytes: archive.pointer() }));
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (e) => { if (e.code !== 'ENOENT') reject(e); });
    archive.pipe(output);
    for (const e of entries) archive.file(e.src, { name: e.name });
    if (typeof onProgress === 'function') archive.on('progress', (p) => onProgress(p));
    archive.finalize();
  });
}

module.exports = {
  api,
  unwrap,
  checkCookie,
  listDir,
  mkdir,
  ensurePath,
  uploadFile,
  createZip,
  fileDigests,
  partAuthMeta,
  completeXml,
  completeAuthMeta,
  ossDate,
  CHUNK,
};
