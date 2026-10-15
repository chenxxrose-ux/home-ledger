// 結算完傳到群組的卡片（LINE Flex Message）。純函式，網站的單元測試和 LINE 機器人共用。
// 跟網站的單元測試共用，所以不 import 別的檔案
const fmt = (n: number) => n.toLocaleString("en-US");

export type SettleCard = {
  id: string;
  no: number;
  by: string; // 誰按的結算
  settledOn: string; // 結算那天 yyyy-mm-dd（台灣時間）
  from: string | null; // 這次最早一筆的日期
  upto: string; // 結算到哪天
  n: number;
  out: number;
  inc: number;
  top: { name: string; amount: number }[]; // 花最多的分類
};

const WD = "日一二三四五六";
const wd = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};
export const longDay = (ymd: string) => `${ymd.replaceAll("-", "/")}（${wd(ymd)}）`;
const md = (ymd: string) => {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
};

const INK = "#1B1F24", SUB = "#4B5563", MUTED = "#8A9099", OUT = "#C2522F", IN = "#2468A8", BLUE = "#2F7FC1";

function row(label: string, value: string, opt: { color?: string; bold?: boolean } = {}) {
  return {
    type: "box", layout: "baseline", spacing: "lg",
    contents: [
      { type: "text", text: label, color: MUTED, size: "md", flex: 2 },
      { type: "text", text: value, color: opt.color || SUB, size: "md", flex: 5, wrap: true, weight: opt.bold ? "bold" : "regular" },
    ],
  };
}

/** 卡片上「看這次明細」的連結：用 Safari 打開（LINE 內建瀏覽器沒有登入） */
export function settleLink(site: string, id: string) {
  return `${site}?openExternalBrowser=1#settle/${id}`;
}

export function settleFlex(c: SettleCard, site: string, heroUrl: string) {
  const period = c.from && c.from !== c.upto ? `${md(c.from)} ～ ${md(c.upto)}` : `${md(c.upto)}（${wd(c.upto)}）`;
  const rows = [
    row("結算日期", longDay(c.settledOn)),
    row("帳的期間", period),
    row("筆數", `${c.n} 筆`),
    row("支出", `${fmt(c.out)} 元`, { color: OUT, bold: true }),
    ...(c.inc > 0 ? [row("收入", `${fmt(c.inc)} 元`, { color: IN, bold: true })] : []),
    ...(c.top.length ? [row("花最多", c.top.map((t) => `${t.name} ${fmt(t.amount)}`).join("・"))] : []),
  ];
  return {
    type: "flex",
    altText: `第 ${c.no} 次結算：${c.n} 筆，支出 ${fmt(c.out)} 元`,
    contents: {
      type: "bubble",
      size: "mega",
      hero: { type: "image", url: heroUrl, size: "full", aspectRatio: "20:11", aspectMode: "cover", backgroundColor: "#FBF7EE" },
      body: {
        type: "box", layout: "vertical", paddingAll: "20px",
        contents: [
          { type: "text", text: `第 ${c.no} 次結算完成`, weight: "bold", size: "xl", color: INK },
          {
            type: "text", wrap: true, size: "md", color: SUB, margin: "md",
            text: `${c.by}把 ${c.n} 筆帳結算好了，累計從 0 重新開始。\n這次的明細都存在網站的「結算紀錄」，隨時可以回來看。`,
          },
          { type: "text", text: `偶們家記帳｜第 ${c.no} 次結算`, weight: "bold", size: "md", color: INK, margin: "xl" },
          { type: "box", layout: "vertical", spacing: "sm", margin: "md", contents: rows },
          { type: "separator", margin: "xl", color: "#EEF0F3" },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "16px", paddingTop: "0px",
        contents: [
          { type: "button", style: "primary", color: BLUE, height: "md", action: { type: "uri", label: "📒 看這次明細", uri: settleLink(site, c.id) } },
          { type: "button", style: "secondary", height: "md", action: { type: "uri", label: "打開記帳網站", uri: `${site}?openExternalBrowser=1` } },
        ],
      },
    },
  };
}

/* ===== 記一筆 → 群組的卡片（像銀行的入帳通知） ===== */
export type EntryCard = {
  id: string;
  kind: "out" | "in";
  by: string; // 誰記的
  amount: number;
  cat: string; // 分類名稱
  title: string; // 名稱（跟分類一樣就空白）
  day: string; // yyyy-mm-dd
  note: string;
  monthly: boolean; // 每月固定
  monthOut: number; // 這個月到現在的支出
  monthIn: number;
};

/** 卡片上「查看這筆明細」：用 Safari 打開這一筆 */
export function entryLink(site: string, id: string) {
  return `${site}?openExternalBrowser=1#entry/${id}`;
}

export function entryFlex(e: EntryCard, site: string, heroUrl: string) {
  const out = e.kind === "out";
  const color = out ? OUT : IN;
  const word = out ? "支出" : "收入";
  const [, m] = e.day.split("-").map(Number);
  const rows = [
    row("日期", `${md(e.day)}（${wd(e.day)}）`),
    row("分類", e.title ? `${e.cat}・${e.title}` : e.cat),
    ...(e.note ? [row("備註", e.note)] : []),
    ...(e.monthly ? [row("每月固定", "是，每個月會自動記")] : []),
    row("誰記的", e.by),
  ];
  return {
    type: "flex",
    altText: `${e.by}記了一筆${word} ${fmt(e.amount)} 元：${e.title || e.cat}`,
    contents: {
      type: "bubble",
      size: "mega",
      hero: { type: "image", url: heroUrl, size: "full", aspectRatio: "20:9", aspectMode: "cover", backgroundColor: out ? "#FDF1EC" : "#EEF4FB" },
      body: {
        type: "box", layout: "vertical", paddingAll: "20px",
        contents: [
          { type: "text", text: `${word}記帳`, weight: "bold", size: "md", color },
          { type: "text", text: `NT$${fmt(e.amount)}`, weight: "bold", size: "3xl", color: INK, margin: "sm" },
          { type: "box", layout: "vertical", spacing: "sm", margin: "lg", contents: rows },
          { type: "separator", margin: "lg", color: "#EEF0F3" },
          {
            type: "text", margin: "md", size: "sm", color: MUTED, wrap: true,
            text: `${m} 月到現在：支出 ${fmt(e.monthOut)}・收入 ${fmt(e.monthIn)}`,
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical", spacing: "xs", paddingAll: "16px", paddingTop: "0px",
        contents: [
          { type: "button", style: "primary", color: BLUE, height: "md", action: { type: "uri", label: "查看這筆明細", uri: entryLink(site, e.id) } },
          { type: "button", style: "link", height: "sm", color: BLUE, action: { type: "uri", label: "打開記帳網站", uri: `${site}?openExternalBrowser=1` } },
        ],
      },
    },
  };
}
