const APOS = "'ʻʼ‘’`";

const LETTERS: Record<string, string> = {
  a: "а", b: "б", c: "ц", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м",
  n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};
const IOTATED: Record<string, string> = { o: "ё", u: "ю", a: "я", e: "е" };

/** Product, brand and integration terms stay in Latin script. */
const KEEP = new Set([
  "Payme", "Click", "Telegram", "Excel", "Google", "Sheets", "Power", "Zapier", "Make", "Didox", "Uzum", "Market", "Eskiz", "iiko", "Trade", "Flow",
  "Baraka", "Coca", "Cola", "Sandbox", "Up", "Evolution", "Prepare", "Complete", "Service", "Layer", "Business", "Partners", "Sales", "Orders",
  "Incoming", "Payments", "Desktop", "Get", "Data", "Web", "From", "Apps", "Script", "Webhook", "webhook", "feed", "streaming", "dataset", "shipped",
  "endpoint", "ping", "Streaming", "IMZO", "Merchant", "Push",
]);
/** Words with a fixed Cyrillic form (abbreviations, loanwords); Uzbek suffixes after them are still transliterated. */
const FIXED: Record<string, string> = {
  ATS: "АТС", INN: "ИНН", STIR: "СТИР", QQS: "ҚҚС", MFO: "МФО", IKPU: "ИКПУ", MChJ: "МЧЖ", Dashboard: "Дашборд", dashboard: "дашборд",
};

const isApos = (c: string | undefined) => c !== undefined && APOS.includes(c);
const isLetter = (c: string | undefined) => c !== undefined && /[a-z]/i.test(c);

const kept = (w: string) => KEEP.has(w) || /\d/.test(w) || /[A-Z]{2}/.test(w) || /[a-z][A-Z]/.test(w);

function word(w: string): string {
  const fixed = Object.keys(FIXED).find((k) => w === k || (w.startsWith(k) && /^[a-z]+$/.test(w.slice(k.length))));
  if (fixed) return FIXED[fixed] + word(w.slice(fixed.length));
  const suffix = /^(.+?)(['ʻʼ‘’`])([a-z]+)$/.exec(w);
  if (suffix && FIXED[suffix[1]]) return FIXED[suffix[1]] + suffix[2] + word(suffix[3]);
  if (suffix && kept(suffix[1])) return suffix[1] + suffix[2] + word(suffix[3]);
  if (kept(w)) return w;
  let out = "";
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    const lc = c.toLowerCase();
    const n1 = w[i + 1]?.toLowerCase();
    let rep: string;
    let len = 1;
    if ((lc === "o" || lc === "g") && isApos(w[i + 1])) {
      rep = lc === "o" ? "ў" : "ғ";
      len = 2;
    } else if (lc === "s" && n1 === "h") {
      rep = "ш";
      len = 2;
    } else if (lc === "c" && n1 === "h") {
      rep = "ч";
      len = 2;
    } else if (lc === "t" && n1 === "s") {
      rep = "ц";
      len = 2;
    } else if (lc === "y" && n1 && IOTATED[n1] && !(n1 === "o" && isApos(w[i + 2]))) {
      rep = IOTATED[n1];
      len = 2;
    } else if (lc === "e" && !isLetter(w[i - 1])) {
      rep = "э";
    } else if (isApos(c)) {
      rep = isLetter(w[i - 1]) && isLetter(w[i + 1]) ? "ъ" : c;
    } else {
      rep = LETTERS[lc] ?? c;
    }
    out += c !== lc ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
    i += len;
  }
  return out;
}

/** Uzbek Latin → Uzbek Cyrillic. `{placeholders}`, URLs and host names (`didox.uz`) are left untouched. */
export function toCyrillic(text: string): string {
  return text
    .split(/(\{\w+\}|https?:\/\/\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:uz|ru|com|biz|kg|io)\b)/)
    .map((part, i) => (i % 2 ? part : part.replace(/[A-Za-z][A-Za-z0-9'ʻʼ‘’`]*/g, word)))
    .join("");
}
