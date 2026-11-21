import type { Entry } from "../../core/messages.js";

/** Insight texts. Key = Uzbek (Latin) template; `{slot}` values (names, numbers) are filled in after translation. */
export const INSIGHTS = {
  // agents
  "Ombor agenti": { ru: "Агент склада", en: "Warehouse agent", ky: "Кампа агенти" },
  "Zaxira, tugash prognozi va yaroqlilik muddati": { ru: "Запасы, прогноз окончания и сроки годности", en: "Stock, run-out forecast and expiry dates", ky: "Запас, түгөнүү божомолу жана жарамдуулук мөөнөтү" },
  "Moliya agenti": { ru: "Финансовый агент", en: "Finance agent", ky: "Финансы агенти" },
  "Debitorlik, kredit limiti va undirish": { ru: "Дебиторка, кредитный лимит и взыскание", en: "Receivables, credit limits and collection", ky: "Дебитордук карыз, кредиттик лимит жана өндүрүү" },
  "Audit agenti": { ru: "Агент аудита", en: "Audit agent", ky: "Аудит агенти" },
  "Inventarizatsiya jadvali va kamomadlar": { ru: "График инвентаризаций и недостачи", en: "Stock-take schedule and shortages", ky: "Инвентаризация графиги жана жетишпестиктер" },
  "Sotuv agenti": { ru: "Агент продаж", en: "Sales agent", ky: "Сатуу агенти" },
  "Reja bajarilishi, faol bo'lmagan mijozlar, prognoz": { ru: "Выполнение плана, неактивные клиенты, прогноз", en: "Plan progress, inactive clients, forecast", ky: "Пландын аткарылышы, активдүү эмес кардарлар, божомол" },
  "Logistika agenti": { ru: "Агент логистики", en: "Logistics agent", ky: "Логистика агенти" },
  "Yetkazish muddatlari va kuryerlar": { ru: "Сроки доставки и курьеры", en: "Delivery times and couriers", ky: "Жеткирүү мөөнөттөрү жана курьерлер" },

  // stock
  "{name} — zaxira 1 kunga ham yetmaydi": { ru: "{name} — запаса не хватит даже на 1 день", en: "{name} — stock will not last even 1 day", ky: "{name} — запас 1 күнгө да жетпейт" },
  "{name} — {n} kunlik zaxira": { ru: "{name} — запас на {n} дн.", en: "{name} — {n} days of stock", ky: "{name} — {n} күндүк запас" },
  "{warehouse}: {qty} dona qoldi, kuniga ~{daily} sotiladi. Tavsiya: {order} dona buyurtma bering.": {
    ru: "{warehouse}: осталось {qty} шт., продаётся ~{daily} в день. Рекомендация: закажите {order} шт.",
    en: "{warehouse}: {qty} units left, ~{daily} sold per day. Suggestion: order {order} units.",
    ky: "{warehouse}: {qty} даана калды, күнүнө ~{daily} сатылат. Сунуш: {order} даана буйрутма бериңиз.",
  },
  "{name}: muddati o'tgan": { ru: "{name}: срок годности истёк", en: "{name}: expired", ky: "{name}: мөөнөтү өтүп кеткен" },
  "{name}: muddati {n} kunda tugaydi": { ru: "{name}: срок годности истекает через {n} дн.", en: "{name}: expires in {n} days", ky: "{name}: мөөнөтү {n} күндө бүтөт" },
  "{n} dona omborda. Aksiya yoki qaytarishni rejalashtiring.": {
    ru: "На складе {n} шт. Запланируйте акцию или возврат.",
    en: "{n} units in stock. Plan a promotion or a return.",
    ky: "Кампада {n} даана. Акция же кайтарууну пландаштырыңыз.",
  },

  // finance
  "{name} kredit limitidan oshdi": { ru: "{name}: превышен кредитный лимит", en: "{name} is over the credit limit", ky: "{name} кредиттик лимиттен ашты" },
  "Qarz {debt} so'm, limit {limit} so'm. Yangi yuklashni to'xtating va undiruvchi yuboring.": {
    ru: "Долг {debt} сум, лимит {limit} сум. Остановите новые отгрузки и направьте взыскателя.",
    en: "Debt UZS {debt}, limit UZS {limit}. Stop new shipments and send a collector.",
    ky: "Карыз {debt} сум, лимит {limit} сум. Жаңы жүктөөнү токтотуп, өндүрүүчү жибериңиз.",
  },
  "30 kunlik undirish darajasi: {rate}%": { ru: "Уровень взыскания за 30 дней: {rate}%", en: "30-day collection rate: {rate}%", ky: "30 күндүк өндүрүү деңгээли: {rate}%" },
  "Sotildi {sold} so'm, undirildi {collected} so'm.": { ru: "Продано на {sold} сум, собрано {collected} сум.", en: "Sold UZS {sold}, collected UZS {collected}.", ky: "{sold} сумга сатылды, {collected} сум өндүрүлдү." },

  // audit
  "{name}: audit kerak": { ru: "{name}: нужен аудит", en: "{name}: audit needed", ky: "{name}: аудит керек" },
  "Oxirgi audit {n} kun oldin o'tkazilgan.": { ru: "Последний аудит был {n} дн. назад.", en: "The last audit was {n} days ago.", ky: "Акыркы аудит {n} күн мурун өткөрүлгөн." },
  "Bu omborda hali audit o'tkazilmagan.": { ru: "На этом складе ещё не было аудита.", en: "This warehouse has never been audited.", ky: "Бул кампада али аудит өткөрүлө элек." },
  "{number} ({warehouse}) farq: {sum} so'm": { ru: "{number} ({warehouse}) расхождение: {sum} сум", en: "{number} ({warehouse}) difference: UZS {sum}", ky: "{number} ({warehouse}) айырма: {sum} сум" },
  "Kamomad aniqlangan — mas'ul shaxs bilan tushuntirish xati oling.": {
    ru: "Выявлена недостача — возьмите объяснительную у ответственного лица.",
    en: "Shortage found — get a written explanation from the person in charge.",
    ky: "Жетишпестик аныкталды — жооптуу адамдан түшүндүрмө кат алыңыз.",
  },
  "Ortiqcha tovar — kirim hujjatlarini tekshiring.": { ru: "Излишек товара — проверьте приходные документы.", en: "Surplus stock — check the inbound documents.", ky: "Ашыкча товар — кирим документтерин текшериңиз." },

  // sales
  "{name} rejadan ortda": { ru: "{name} отстаёт от плана", en: "{name} is behind plan", ky: "{name} пландан артта" },
  "Reja {plan} so'm, bajarildi {done}% (kutilgan {expected}%).": {
    ru: "План {plan} сум, выполнено {done}% (ожидалось {expected}%).",
    en: "Plan UZS {plan}, done {done}% (expected {expected}%).",
    ky: "План {plan} сум, аткарылды {done}% (күтүлгөн {expected}%).",
  },
  "{name} {n} kundan beri buyurtma bermadi": { ru: "{name} не заказывает уже {n} дн.", en: "{name} has not ordered for {n} days", ky: "{name} {n} күндөн бери буйрутма берген жок" },
  "{agent} — tashrif rejalashtiring yoki aksiya taklif qiling.": { ru: "{agent} — запланируйте визит или предложите акцию.", en: "{agent} — plan a visit or offer a promotion.", ky: "{agent} — барууну пландаштырыңыз же акция сунуштаңыз." },
  "Agent biriktirilmagan — tashrif rejalashtiring yoki aksiya taklif qiling.": {
    ru: "Агент не назначен — запланируйте визит или предложите акцию.",
    en: "No agent assigned — plan a visit or offer a promotion.",
    ky: "Агент бекитилген эмес — барууну пландаштырыңыз же акция сунуштаңыз.",
  },
  "Keyingi oy prognozi: {sum} so'm": { ru: "Прогноз на следующий месяц: {sum} сум", en: "Next month forecast: UZS {sum}", ky: "Кийинки айдын божомолу: {sum} сум" },
  "So'nggi 6 oylik sotuv trendi asosida hisoblandi.": { ru: "Рассчитано по тренду продаж за последние 6 месяцев.", en: "Based on the sales trend of the last 6 months.", ky: "Акыркы 6 айдагы сатуу тренди боюнча эсептелди." },

  // logistics
  "{n} ta yetkazish kechikmoqda": { ru: "Опаздывают доставки: {n}", en: "{n} deliveries are late", ky: "{n} жеткирүү кечигүүдө" },
  "Rejalashtirilgan sanadan o'tib ketgan. Kuryerlarni qayta taqsimlang.": {
    ru: "Плановая дата прошла. Перераспределите курьеров.",
    en: "The planned date has passed. Reassign couriers.",
    ky: "Пландалган күн өтүп кетти. Курьерлерди кайра бөлүштүрүңүз.",
  },
  "{n} ta yetkazish muvaffaqiyatsiz": { ru: "Неудачные доставки: {n}", en: "{n} deliveries failed", ky: "{n} жеткирүү ийгиликсиз" },
  "Sabablarni aniqlang va qayta yetkazishni rejalashtiring.": { ru: "Выясните причины и запланируйте повторную доставку.", en: "Find the causes and plan a redelivery.", ky: "Себептерин аныктап, кайра жеткирүүнү пландаштырыңыз." },
} satisfies Record<string, Entry>;

export type InsightKey = keyof typeof INSIGHTS;
