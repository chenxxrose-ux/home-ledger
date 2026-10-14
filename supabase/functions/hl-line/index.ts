// 偶們家記帳：LINE 機器人（阿寶和草莓的群組，跟滷味的機器人分開）
// 網站打來的（要登入、而且是 hl_members 才可以）：
//   status 狀態、setup 貼 Channel secret／access token、pair 產生 6 位數配對碼、unlink 解除、
//   notify_set 開關「每記一筆就傳」、notify 記了一筆後傳到群組（同一筆只會傳一次）
// LINE 打來的 Webhook（用 Channel secret 驗簽章）：
//   群組裡傳配對碼 → 綁定；打「晚餐 320」→ 記一筆並回覆（回覆不算免費則數）；
//   「本月」看這個月；「取消」刪掉剛剛在群組記的那筆；「說明」看用法
// 資料庫排程每月 1 號打 op=monthly（帶只存在資料庫裡的 cron_key）→ 上個月總結
import { createClient } from "npm:@supabase/supabase-js@2";
import { fmt, parseLine, type Cat } from "./parse.ts";

const ORIGINS = ["https://chenxxrose-ux.github.io", "http://localhost:5173", "http://localhost:4173"];
const API = "https://api.line.me/v2/bot";
const SELF = "https://bhaxitqzdrcndshxgvtx.supabase.co/functions/v1/hl-line";
const SITE = "https://chenxxrose-ux.github.io/home-ledger/";

function serviceKey(): string {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return ""; }
}
const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), { auth: { persistSession: false } });

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

type Cfg = Record<string, string>;
async function getCfg(): Promise<Cfg> {
  const { data } = await db.from("hl_line_cfg").select("k,v");
  return Object.fromEntries((data || []).map((r: { k: string; v: string }) => [r.k, r.v]));
}
async function setCfg(p: Cfg) {
  const { error } = await db.from("hl_line_cfg").upsert(Object.entries(p).map(([k, v]) => ({ k, v, updated_at: new Date().toISOString() })));
  if (error) throw error;
}
async function delCfg(keys: string[]) { await db.from("hl_line_cfg").delete().in("k", keys); }

async function line(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const t = await r.text();
  let j: any = {}; try { j = t ? JSON.parse(t) : {}; } catch { /* 非 JSON */ }
  return { ok: r.ok, status: r.status, j };
}
const say = (token: string, replyToken: string, text: string) =>
  line(token, "/message/reply", { method: "POST", body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }) });
const push = (token: string, to: string, text: string, retryKey: string) =>
  line(token, "/message/push", { method: "POST", body: JSON.stringify({ to, messages: [{ type: "text", text }] }), headers: { "X-Line-Retry-Key": retryKey } });

async function quota(token: string) {
  const [q, c] = await Promise.all([line(token, "/message/quota"), line(token, "/message/quota/consumption")]);
  if (!q.ok || !c.ok) return null;
  return q.j.type === "limited" ? { used: c.j.totalUsage || 0, max: q.j.value } : null;
}

async function verifySig(secret: string, body: string, sig: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const want = btoa(String.fromCharCode(...mac));
  if (want.length !== sig.length) return false;
  let d = 0; for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}

/* ===== 日期（台灣時間） ===== */
function tw(offsetDays = 0) {
  const t = new Date(Date.now() + 8 * 3600 * 1000 + offsetDays * 86400000);
  return { ymd: t.toISOString().slice(0, 10), y: t.getUTCFullYear(), m: t.getUTCMonth() + 1 };
}
const WD = "日一二三四五六";
function dayLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}（${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
}
function monthRange(y: number, m: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

type Row = { kind: "out" | "in"; amount: number; category_id: string };
async function monthRows(y: number, m: number): Promise<Row[]> {
  const { from, to } = monthRange(y, m);
  const { data, error } = await db.from("hl_entries").select("kind,amount,category_id").is("deleted_at", null).gte("day", from).lte("day", to);
  if (error) throw error;
  return (data || []) as Row[];
}
const sum = (rows: Row[], kind: "out" | "in") => rows.filter((r) => r.kind === kind).reduce((a, r) => a + r.amount, 0);
async function categories(): Promise<(Cat & { sort: number })[]> {
  const { data } = await db.from("hl_categories").select("id,kind,name,hidden,sort").order("sort");
  return (data || []) as (Cat & { sort: number })[];
}

async function monthText(y: number, m: number, title: string) {
  const [rows, cats] = await Promise.all([monthRows(y, m), categories()]);
  const out = sum(rows, "out"), inc = sum(rows, "in");
  const by = new Map<string, number>();
  for (const r of rows) if (r.kind === "out") by.set(r.category_id, (by.get(r.category_id) || 0) + r.amount);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => `・${cats.find((c) => c.id === id)?.name || "其他"}　${fmt(n)} 元`);
  return [
    title,
    `支出　${fmt(out)} 元`,
    `收入　${fmt(inc)} 元`,
    `收支　${inc - out >= 0 ? "+" : "−"}${fmt(Math.abs(inc - out))} 元`,
    ...(top.length ? ["", "花最多的：", ...top] : []),
    "",
    SITE,
  ].join("\n");
}

const HELP = [
  "在這個群組直接打字就能記帳：",
  "・晚餐 320",
  "・全聯 1280",
  "・薪水 42000（收入）",
  "・+500 賣二手（前面加 + 就是收入）",
  "・記 雜支 50（開頭打「記」，對不到分類就放「其他」）",
  "",
  "打「本月」看這個月花了多少，打「取消」刪掉剛剛在群組記的那筆。",
].join("\n");

/* ===== LINE 打來的 Webhook ===== */
async function webhook(body: string, sig: string) {
  const cfg = await getCfg();
  if (!cfg.secret || !cfg.token || !(await verifySig(cfg.secret, body, sig))) return new Response("bad sig", { status: 401 });
  let events: any[] = [];
  try { events = JSON.parse(body).events || []; } catch { return new Response("ok"); }
  for (const ev of events) {
    const src = ev.source || {}, gid = src.groupId || src.roomId || "";
    if (ev.type === "join" && gid && gid !== cfg.group) {
      await say(cfg.token, ev.replyToken, "大家好！我是偶們家記帳。請打開記帳網站 → 設定 → LINE 群組，把上面顯示的 6 位數字傳到這裡，就連上了。");
      continue;
    }
    if (ev.type === "leave" && gid && gid === cfg.group) { await delCfg(["group", "group_name"]); continue; }
    if (ev.type !== "message" || ev.message?.type !== "text" || !gid) continue;
    const text = String(ev.message.text || "").trim();

    // 配對
    const code = text.replace(/\s/g, "");
    if (cfg.pair && /^\d{6}$/.test(code) && code === cfg.pair) {
      if (Date.now() > Number(cfg.pair_exp || 0)) { await say(cfg.token, ev.replyToken, "這組數字過期了，請在網站上重新產生一組。"); continue; }
      let name = "";
      if (src.groupId) { const s = await line(cfg.token, `/group/${src.groupId}/summary`); if (s.ok) name = s.j.groupName || ""; }
      await setCfg({ group: gid, group_name: name || "LINE 群組" });
      await delCfg(["pair", "pair_exp"]);
      await say(cfg.token, ev.replyToken, "✅ 連上了！之後在網站記一筆，這裡就會收到。\n\n" + HELP);
      continue;
    }
    if (gid !== cfg.group) continue; // 只聽綁定的群組

    if (/^(說明|怎麼用|help)$/i.test(text)) { await say(cfg.token, ev.replyToken, HELP); continue; }
    if (/^(本月|這個月|这个月|月報)$/.test(text)) {
      const { y, m } = tw();
      await say(cfg.token, ev.replyToken, await monthText(y, m, `📊 ${m} 月到今天`));
      continue;
    }
    if (/^(取消|刪掉|删掉|記錯了)$/.test(text)) {
      const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data } = await db.from("hl_entries").select("id,kind,amount,title,category_id").eq("via", "line").is("deleted_at", null)
        .gte("created_at", since).order("created_at", { ascending: false }).limit(1);
      const e = data?.[0];
      if (!e) { await say(cfg.token, ev.replyToken, "30 分鐘內沒有在群組記的帳。要改以前的，請到網站修改。"); continue; }
      await db.from("hl_entries").update({ deleted_at: new Date().toISOString() }).eq("id", e.id);
      const c = (await categories()).find((x) => x.id === e.category_id);
      await say(cfg.token, ev.replyToken, `🗑 已刪掉：${c?.name || ""}${e.title ? "・" + e.title : ""}　${fmt(e.amount)} 元`);
      continue;
    }

    const cats = await categories();
    const p = parseLine(text, cats);
    if (!p) continue; // 一般聊天，不回
    const { ymd, y, m } = tw();
    const { error } = await db.from("hl_entries").insert({ ...p, day: ymd, via: "line" });
    if (error) { console.error("insert", error); await say(cfg.token, ev.replyToken, "記帳失敗了，請到網站記一次。"); continue; }
    const rows = await monthRows(y, m);
    const c = cats.find((x) => x.id === p.category_id);
    await say(cfg.token, ev.replyToken, [
      `✅ 記好了　${p.kind === "out" ? "支出" : "收入"}`,
      `${c?.name || ""}${p.title ? "・" + p.title : ""}　${fmt(p.amount)} 元`,
      `${m} 月支出 ${fmt(sum(rows, "out"))}・收入 ${fmt(sum(rows, "in"))}`,
      "記錯了打「取消」",
    ].join("\n"));
  }
  return new Response("ok");
}

/* ===== 網站打來的：確認是阿寶或草莓 ===== */
async function member(req: Request): Promise<{ id: string; name: string } | null> {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  if (!data?.user) return null;
  const { data: m } = await db.from("hl_members").select("user_id,name").eq("user_id", data.user.id).maybeSingle();
  return m ? { id: m.user_id, name: m.name } : null;
}

async function notify(cfg: Cfg, me: { id: string; name: string }, id: string) {
  if (!cfg.token || !cfg.group || cfg.notify === "0") return { sent: false };
  const { data: e } = await db.from("hl_entries").select("id,kind,amount,title,category_id,day,note,rule_id,created_by,created_at,via,deleted_at").eq("id", id).maybeSingle();
  // 只傳自己剛在網站記的那筆（每月自動補的不傳，省免費則數）
  if (!e || e.deleted_at || e.via !== "app" || e.created_by !== me.id || Date.now() - Date.parse(e.created_at) > 10 * 60 * 1000) return { sent: false };
  const cats = await categories();
  const c = cats.find((x) => x.id === e.category_id);
  const [y, m] = e.day.split("-").map(Number);
  const rows = await monthRows(y, m);
  const text = [
    `🧾 ${me.name}記了一筆${e.kind === "out" ? "支出" : "收入"}`,
    `${c?.name || ""}${e.title && e.title !== c?.name ? "・" + e.title : ""}　${fmt(e.amount)} 元${e.rule_id ? "（每月）" : ""}`,
    ...(e.note ? [e.note] : []),
    dayLabel(e.day),
    `${m} 月支出 ${fmt(sum(rows, "out"))}・收入 ${fmt(sum(rows, "in"))}`,
  ].join("\n");
  const r = await push(cfg.token, cfg.group, text, e.id);
  if (r.status === 409) return { sent: true, dup: true };
  if (r.status === 429) return { sent: false, why: "quota" };
  if (!r.ok) { console.error("push", r.status, r.j); return { sent: false, why: "line " + r.status }; }
  return { sent: true };
}

async function retryKey(s: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x40; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return new Response("ok");
  let raw = "";
  try { raw = await req.text(); } catch { return json(req, { error: "bad body" }, 400); }
  const sig = req.headers.get("x-line-signature");
  if (sig) { try { return await webhook(raw, sig); } catch (e) { console.error(e); return new Response("ok"); } }

  if (raw.length > 10000) return json(req, { error: "too big" }, 413);
  let b: any; try { b = JSON.parse(raw); } catch { return json(req, { error: "bad json" }, 400); }

  try {
    if (b.op === "monthly") { // 資料庫排程：key 只存在資料庫裡
      const cfg = await getCfg();
      if (!cfg.cron_key || typeof b.key !== "string" || b.key !== cfg.cron_key) return json(req, { error: "no" }, 403);
      if (!cfg.token || !cfg.group) return json(req, { sent: false, why: "no group" });
      const { y, m } = tw(-1); // 1 號早上 → 昨天就是上個月
      const r = await push(cfg.token, cfg.group, await monthText(y, m, `📅 ${y} 年 ${m} 月總結`), await retryKey(`monthly/${y}-${m}`));
      return json(req, { sent: r.ok || r.status === 409 });
    }

    const me = await member(req);
    if (!me) return json(req, { error: "not member" }, 403);
    const cfg = await getCfg();

    if (b.op === "status") {
      const ready = !!(cfg.token && cfg.secret);
      return json(req, {
        ready, basicId: cfg.basic_id || "", botName: cfg.bot_name || "",
        group: cfg.group ? (cfg.group_name || "LINE 群組") : "", notify: cfg.notify !== "0",
        quota: ready && cfg.group ? await quota(cfg.token) : null,
      });
    }
    if (b.op === "setup") {
      const secret = String(b.secret || "").trim(), token = String(b.token || "").trim();
      if (!/^[0-9a-f]{32}$/i.test(secret)) return json(req, { error: "bad secret" }, 400);
      if (token.length < 100 || token.length > 400 || /\s/.test(token)) return json(req, { error: "bad token" }, 400);
      const info = await line(token, "/info");
      if (!info.ok) return json(req, { error: "token rejected" }, 400);
      const wh = await line(token, "/channel/webhook/endpoint", { method: "PUT", body: JSON.stringify({ endpoint: SELF }) });
      const same = cfg.token === token;
      await setCfg({ secret, token, basic_id: info.j.basicId || "", bot_name: info.j.displayName || "" });
      if (!same) await delCfg(["group", "group_name"]); // 換了官方帳號 → 舊群組不能用
      return json(req, { ok: true, basicId: info.j.basicId || "", botName: info.j.displayName || "", webhook: wh.ok });
    }
    if (b.op === "pair") {
      if (!cfg.token) return json(req, { error: "not ready" }, 409);
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
      await setCfg({ pair: code, pair_exp: String(Date.now() + 15 * 60 * 1000) });
      return json(req, { code, basicId: cfg.basic_id || "" });
    }
    if (b.op === "unlink") { await delCfg(["group", "group_name", "pair", "pair_exp"]); return json(req, { ok: true }); }
    if (b.op === "notify_set") { await setCfg({ notify: b.on ? "1" : "0" }); return json(req, { ok: true }); }
    if (b.op === "notify") {
      if (typeof b.id !== "string" || !/^[0-9a-f-]{36}$/.test(b.id)) return json(req, { error: "bad id" }, 400);
      return json(req, await notify(cfg, me, b.id));
    }
    return json(req, { error: "op" }, 400);
  } catch (e) {
    console.error(e);
    return json(req, { error: "server" }, 500);
  }
});
