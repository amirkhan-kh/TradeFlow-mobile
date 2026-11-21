import type { Messages } from "./types";

/** Strings used only by the mobile app. */
export const mobile = {
  "Ko'proq": { ru: "Ещё", en: "More", ky: "Дагы" },
  "Yo'q": { ru: "Нет", en: "No", ky: "Жок" },
  Tozalash: { ru: "Очистить", en: "Clear", ky: "Тазалоо" },
  "Hisobdan chiqasizmi?": { ru: "Выйти из аккаунта?", en: "Log out of your account?", ky: "Аккаунттан чыгасызбы?" },
  "Demo hisoblar": { ru: "Демо-аккаунты", en: "Demo accounts", ky: "Демо аккаунттар" },
  "Demoga yozilish": { ru: "Записаться на демо", en: "Book a demo", ky: "Демого жазылуу" },
  "Ma'lumot qoldiring — mutaxassisimiz siz bilan bog'lanadi": {
    ru: "Оставьте контакты — специалист свяжется с вами",
    en: "Leave your details — our specialist will contact you",
    ky: "Маалымат калтырыңыз — адисибиз сиз менен байланышат",
  },
  "So'rov yuborildi — tez orada bog'lanamiz": { ru: "Заявка отправлена — скоро свяжемся", en: "Request sent — we will contact you soon", ky: "Сурам жөнөтүлдү — жакында байланышабыз" },
  Yuborish: { ru: "Отправить", en: "Send", ky: "Жөнөтүү" },
  "Ilovani yangilang": { ru: "Обновите приложение", en: "Update the app", ky: "Тиркемени жаңылаңыз" },
  "Bu versiya eskirgan. Davom etish uchun ilovani yangilang.": {
    ru: "Эта версия устарела. Обновите приложение, чтобы продолжить.",
    en: "This version is outdated. Update the app to continue.",
    ky: "Бул версия эскирген. Улантуу үчүн тиркемени жаңылаңыз.",
  },
  Yangilash: { ru: "Обновить", en: "Update", ky: "Жаңылоо" },
} satisfies Messages;
