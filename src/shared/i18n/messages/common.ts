import type { Messages } from "./types";

/** Shared UI, statuses, roles, network errors. */
export const common = {
  // shared/ui
  "Qidirish…": { ru: "Поиск…", en: "Search…", ky: "Издөө…" },
  Jami: { ru: "Всего:", en: "Total:", ky: "Бардыгы:" },
  ta: { ru: "", en: "", ky: "" },
  "Oldingi sahifa": { ru: "Предыдущая страница", en: "Previous page", ky: "Мурунку барак" },
  "Keyingi sahifa": { ru: "Следующая страница", en: "Next page", ky: "Кийинки барак" },
  "Yuklanmoqda…": { ru: "Загрузка…", en: "Loading…", ky: "Жүктөлүүдө…" },
  "Ma'lumot yo'q": { ru: "Нет данных", en: "No data", ky: "Маалымат жок" },
  "Qayta urinish": { ru: "Повторить", en: "Try again", ky: "Кайра аракет кылуу" },
  Yopish: { ru: "Закрыть", en: "Close", ky: "Жабуу" },
  "Hech narsa topilmadi": { ru: "Ничего не найдено", en: "Nothing found", ky: "Эч нерсе табылган жок" },
  "Qidiring va tanlang…": { ru: "Найдите и выберите…", en: "Search and select…", ky: "Издеп, тандаңыз…" },
  "Ro'yxatdan tanlang": { ru: "Выберите из списка", en: "Pick an item from the list", ky: "Тизмеден тандаңыз" },
  "Ombor qidiring…": { ru: "Найдите склад…", en: "Search warehouse…", ky: "Кампа издеңиз…" },
  "Juda kuchsiz": { ru: "Очень слабый", en: "Very weak", ky: "Өтө алсыз" },
  Kuchsiz: { ru: "Слабый", en: "Weak", ky: "Алсыз" },
  "O'rtacha": { ru: "Средний", en: "Fair", ky: "Орточо" },
  Yaxshi: { ru: "Хороший", en: "Good", ky: "Жакшы" },
  Kuchli: { ru: "Надёжный", en: "Strong", ky: "Күчтүү" },
  "Parol yaratish": { ru: "Сгенерировать пароль", en: "Generate password", ky: "Сырсөз түзүү" },
  "Kuchli parol yaratish": { ru: "Сгенерировать надёжный пароль", en: "Generate a strong password", ky: "Күчтүү сырсөз түзүү" },
  "Parolni yashirish": { ru: "Скрыть пароль", en: "Hide password", ky: "Сырсөздү жашыруу" },
  "Parolni ko'rsatish": { ru: "Показать пароль", en: "Show password", ky: "Сырсөздү көрсөтүү" },
  Til: { ru: "Язык", en: "Language", ky: "Тил" },

  // shared/lib/api
  "Server javob bermadi — qayta urinib ko'ring": { ru: "Сервер не ответил — попробуйте ещё раз", en: "The server did not respond — try again", ky: "Сервер жооп берген жок — кайра аракет кылыңыз" },
  "Tarmoq bilan aloqa yo'q — internetni tekshiring": { ru: "Нет соединения с сетью — проверьте интернет", en: "No network connection — check your internet", ky: "Тармак менен байланыш жок — интернетти текшериңиз" },
  "Sessiya tugadi": { ru: "Сеанс завершён", en: "Session expired", ky: "Сессия аяктады" },
  "Xatolik yuz berdi": { ru: "Произошла ошибка", en: "Something went wrong", ky: "Ката кетти" },

  // shared/lib/status: orders
  Yangi: { ru: "Новый", en: "New", ky: "Жаңы" },
  Tasdiqlangan: { ru: "Подтверждён", en: "Confirmed", ky: "Ырасталган" },
  Yuklangan: { ru: "Отгружен", en: "Shipped", ky: "Жүктөлгөн" },
  Yetkazildi: { ru: "Доставлен", en: "Delivered", ky: "Жеткирилди" },
  "Bekor qilingan": { ru: "Отменён", en: "Cancelled", ky: "Жокко чыгарылган" },
  // deliveries
  Kutilmoqda: { ru: "Ожидает", en: "Pending", ky: "Күтүүдө" },
  "Yo'lda": { ru: "В пути", en: "On the way", ky: "Жолдо" },
  Muvaffaqiyatsiz: { ru: "Неудачно", en: "Failed", ky: "Ийгиликсиз" },
  // audits
  Tekshirilmoqda: { ru: "Проверяется", en: "In progress", ky: "Текшерилүүдө" },
  "Tasdiq kutmoqda": { ru: "Ждёт утверждения", en: "Awaiting approval", ky: "Ырастоону күтүүдө" },
  Tasdiqlandi: { ru: "Утверждён", en: "Approved", ky: "Ырасталды" },
  // leads
  "Bog'lanildi": { ru: "Связались", en: "Contacted", ky: "Байланышылды" },
  "Mijozga aylandi": { ru: "Стал клиентом", en: "Converted", ky: "Кардарга айланды" },
  "Yo'qotildi": { ru: "Потерян", en: "Lost", ky: "Жоготулду" },
  // stock movements
  Kirim: { ru: "Приход", en: "Inbound", ky: "Кирим" },
  Chiqim: { ru: "Расход", en: "Outbound", ky: "Чыгым" },
  "Ko'chirish": { ru: "Перемещение", en: "Transfer", ky: "Которуу" },
  Tuzatish: { ru: "Корректировка", en: "Adjustment", ky: "Оңдоо" },
  // payments
  Naqd: { ru: "Наличные", en: "Cash", ky: "Накталай" },
  Karta: { ru: "Карта", en: "Card", ky: "Карта" },
  // integrations
  Yuborildi: { ru: "Отправлено", en: "Sent", ky: "Жөнөтүлдү" },
  "Javob berildi": { ru: "Отвечен", en: "Answered", ky: "Жооп берилди" },
  "O'tkazib yuborildi": { ru: "Пропущен", en: "Missed", ky: "Өткөрүлүп жиберилди" },
  // roles
  Administrator: { ru: "Администратор", en: "Administrator", ky: "Администратор" },
  Menejer: { ru: "Менеджер", en: "Manager", ky: "Менеджер" },
  "Savdo agenti": { ru: "Торговый агент", en: "Sales agent", ky: "Соода агенти" },
  Kuryer: { ru: "Курьер", en: "Courier", ky: "Курьер", cy: "Курьер" },
  Auditor: { ru: "Аудитор", en: "Auditor", ky: "Аудитор" },
} satisfies Messages;
