import { phrase, type Lang } from "../../core/i18n.js";
import { INSIGHTS, type InsightKey } from "./messages.js";
import * as repo from "./repository.js";

type Severity = "high" | "medium" | "low";
interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  href: string;
}
interface Agent {
  key: "stock" | "finance" | "audit" | "sales" | "logistics";
  name: string;
  role: string;
  findings: Finding[];
}

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
const days = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

/** Linear trend over closed months → next month estimate. */
function forecast(values: number[]): number {
  const n = values.length;
  if (n < 2) return values[0] ?? 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  });
  return Math.max(0, yMean + (num / den) * (n - xMean));
}

export async function run(lang: Lang) {
  const t = (key: InsightKey, vars?: Record<string, string | number>) => phrase(INSIGHTS, lang, key, vars);
  const [cover, expiring, overlimit, collection, stale, variance, dormant, pace, monthly, late] = await Promise.all([
    repo.stockCover(),
    repo.expiring(),
    repo.overlimit(),
    repo.collection(),
    repo.staleWarehouses(),
    repo.auditVariance(),
    repo.dormantClients(),
    repo.agentPace(),
    repo.monthlyRevenue(),
    repo.lateDeliveries(),
  ]);

  const stock: Finding[] = cover
    .map((c) => ({ ...c, left: c.available / c.daily }))
    .filter((c) => c.left < 10)
    .sort((a, b) => a.left - b.left)
    .slice(0, 5)
    .map((c) => ({
      severity: c.left < 4 ? "high" : "medium",
      title: c.left < 1 ? t("{name} — zaxira 1 kunga ham yetmaydi", { name: c.name }) : t("{name} — {n} kunlik zaxira", { name: c.name, n: Math.floor(c.left) }),
      detail: t("{warehouse}: {qty} dona qoldi, kuniga ~{daily} sotiladi. Tavsiya: {order} dona buyurtma bering.", {
        warehouse: c.warehouse_name,
        qty: c.available,
        daily: c.daily.toFixed(1),
        order: fmt(Math.max(0, c.daily * 21 - c.available)),
      }),
      href: "/dashboard/stock?low=true",
    }));
  for (const e of expiring) {
    stock.push({
      severity: "medium",
      title: days(e.expires_at) >= 0 ? t("{name}: muddati o'tgan", { name: e.name }) : t("{name}: muddati {n} kunda tugaydi", { name: e.name, n: -days(e.expires_at) }),
      detail: t("{n} dona omborda. Aksiya yoki qaytarishni rejalashtiring.", { n: e.units }),
      href: "/dashboard/products",
    });
  }

  const rate = collection.sold > 0 ? (collection.collected / collection.sold) * 100 : 100;
  const finance: Finding[] = overlimit.map((c) => ({
    severity: "high",
    title: t("{name} kredit limitidan oshdi", { name: c.name }),
    detail: t("Qarz {debt} so'm, limit {limit} so'm. Yangi yuklashni to'xtating va undiruvchi yuboring.", { debt: fmt(c.balance), limit: fmt(c.credit_limit) }),
    href: `/dashboard/clients?status=overlimit`,
  }));
  finance.push({
    severity: rate < 70 ? "high" : rate < 90 ? "medium" : "low",
    title: t("30 kunlik undirish darajasi: {rate}%", { rate: rate.toFixed(0) }),
    detail: t("Sotildi {sold} so'm, undirildi {collected} so'm.", { sold: fmt(collection.sold), collected: fmt(collection.collected) }),
    href: "/dashboard/finance",
  });

  const audit: Finding[] = [
    ...stale.map((w) => ({
      severity: (w.last_audit ? "medium" : "high") as Severity,
      title: t("{name}: audit kerak", { name: w.name }),
      detail: w.last_audit ? t("Oxirgi audit {n} kun oldin o'tkazilgan.", { n: days(w.last_audit) }) : t("Bu omborda hali audit o'tkazilmagan."),
      href: "/dashboard/audits",
    })),
    ...variance.map((v) => ({
      severity: (Math.abs(v.variance) > 1_000_000 ? "high" : "medium") as Severity,
      title: t("{number} ({warehouse}) farq: {sum} so'm", { number: v.number, warehouse: v.warehouse_name, sum: fmt(v.variance) }),
      detail: v.variance < 0 ? t("Kamomad aniqlangan — mas'ul shaxs bilan tushuntirish xati oling.") : t("Ortiqcha tovar — kirim hujjatlarini tekshiring."),
      href: `/dashboard/audits/${v.id}`,
    })),
  ];

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const expectedShare = dayOfMonth / daysInMonth;
  const sales: Finding[] = [
    ...pace
      .filter((a) => a.revenue / a.plan < expectedShare * 0.85)
      .map((a) => ({
        severity: "medium" as Severity,
        title: t("{name} rejadan ortda", { name: a.full_name }),
        detail: t("Reja {plan} so'm, bajarildi {done}% (kutilgan {expected}%).", {
          plan: fmt(a.plan),
          done: ((a.revenue / a.plan) * 100).toFixed(0),
          expected: (expectedShare * 100).toFixed(0),
        }),
        href: "/dashboard/agents",
      })),
    ...dormant.map((c) => ({
      severity: "low" as Severity,
      title: t("{name} {n} kundan beri buyurtma bermadi", { name: c.name, n: days(c.last_order) }),
      detail: c.agent_name
        ? t("{agent} — tashrif rejalashtiring yoki aksiya taklif qiling.", { agent: c.agent_name })
        : t("Agent biriktirilmagan — tashrif rejalashtiring yoki aksiya taklif qiling."),
      href: "/dashboard/clients",
    })),
  ];
  const next = forecast(monthly.map((m) => m.revenue));
  sales.unshift({
    severity: "low",
    title: t("Keyingi oy prognozi: {sum} so'm", { sum: fmt(next) }),
    detail: t("So'nggi 6 oylik sotuv trendi asosida hisoblandi."),
    href: "/dashboard",
  });

  const logistics: Finding[] = [];
  if (late[0].count > 0) {
    logistics.push({
      severity: "high",
      title: t("{n} ta yetkazish kechikmoqda", { n: late[0].count }),
      detail: t("Rejalashtirilgan sanadan o'tib ketgan. Kuryerlarni qayta taqsimlang."),
      href: "/dashboard/deliveries?status=pending",
    });
  }
  if (late[0].failed > 0) {
    logistics.push({
      severity: "medium",
      title: t("{n} ta yetkazish muvaffaqiyatsiz", { n: late[0].failed }),
      detail: t("Sabablarni aniqlang va qayta yetkazishni rejalashtiring."),
      href: "/dashboard/deliveries?status=failed",
    });
  }

  const agents: Agent[] = [
    { key: "stock", name: t("Ombor agenti"), role: t("Zaxira, tugash prognozi va yaroqlilik muddati"), findings: stock },
    { key: "finance", name: t("Moliya agenti"), role: t("Debitorlik, kredit limiti va undirish"), findings: finance },
    { key: "audit", name: t("Audit agenti"), role: t("Inventarizatsiya jadvali va kamomadlar"), findings: audit },
    { key: "sales", name: t("Sotuv agenti"), role: t("Reja bajarilishi, faol bo'lmagan mijozlar, prognoz"), findings: sales },
    { key: "logistics", name: t("Logistika agenti"), role: t("Yetkazish muddatlari va kuryerlar"), findings: logistics },
  ];
  return { generated_at: new Date().toISOString(), forecast_next_month: next, agents };
}
