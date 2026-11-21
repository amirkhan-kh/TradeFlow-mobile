/** Static catalog for the demo seed: warehouses, product families, regions, people. */

export const WAREHOUSES = [
  // code, name, city, address, capacity (units, ~70% full at seeded stock levels), manager
  ["TSH-01", "Toshkent Markaziy", "Toshkent", "Yunusobod t., Amir Temur ko'chasi 108", 350000, "Jasur Karimov"],
  ["TSH-02", "Sergeli Logistika Hub", "Toshkent", "Sergeli t., Yangi Sergeli 4", 260000, "Dilshod Rahimov"],
  ["SMQ-01", "Samarqand Ombori", "Samarqand", "Registon ko'chasi 21", 180000, "Bekzod Aliyev"],
  ["FRG-01", "Farg'ona Ombori", "Farg'ona", "Al-Farg'oniy ko'chasi 5", 170000, "Shoxrux Tursunov"],
  ["AND-01", "Andijon Ombori", "Andijon", "Bobur shoh ko'chasi 44", 160000, "Islom Qodirov"],
  ["NMG-01", "Namangan Ombori", "Namangan", "Uychi ko'chasi 9", 160000, "Murod Yo'ldoshev"],
  ["BXR-01", "Buxoro Ombori", "Buxoro", "Navoiy shoh ko'chasi 12", 150000, "Akmal Sobirov"],
  ["QSH-01", "Qarshi Ombori", "Qarshi", "Mustaqillik shoh ko'chasi 77", 150000, "Sanjar Hamroyev"],
] as const;

/** District branch warehouses: smaller, serve the outlets of their own district next to the regional hub. */
export const BRANCHES = [
  // code, region, district, city
  ["TSH-03", "Toshkent", "Chilonzor", "Toshkent"],
  ["TSH-04", "Toshkent", "Mirzo Ulug'bek", "Toshkent"],
  ["TSH-05", "Toshkent", "Yakkasaroy", "Toshkent"],
  ["TSH-06", "Toshkent", "Olmazor", "Toshkent"],
  ["TSH-07", "Toshkent", "Uchtepa", "Toshkent"],
  ["TSH-08", "Toshkent", "Yashnobod", "Toshkent"],
  ["TSV-01", "Toshkent viloyati", "Chirchiq", "Chirchiq"],
  ["TSV-02", "Toshkent viloyati", "Olmaliq", "Olmaliq"],
  ["TSV-03", "Toshkent viloyati", "Angren", "Angren"],
  ["TSV-04", "Toshkent viloyati", "Nurafshon", "Nurafshon"],
  ["TSV-05", "Toshkent viloyati", "Yangiyo'l", "Yangiyo'l"],
  ["TSV-06", "Toshkent viloyati", "Bekobod", "Bekobod"],
  ["SMQ-02", "Samarqand", "Urgut", "Urgut"],
  ["SMQ-03", "Samarqand", "Kattaqo'rg'on", "Kattaqo'rg'on"],
  ["SMQ-04", "Samarqand", "Bulung'ur", "Bulung'ur"],
  ["SMQ-05", "Samarqand", "Ishtixon", "Ishtixon"],
  ["FRG-02", "Farg'ona", "Marg'ilon", "Marg'ilon"],
  ["FRG-03", "Farg'ona", "Qo'qon", "Qo'qon"],
  ["FRG-04", "Farg'ona", "Quva", "Quva"],
  ["FRG-05", "Farg'ona", "Rishton", "Rishton"],
  ["AND-02", "Andijon", "Asaka", "Asaka"],
  ["AND-03", "Andijon", "Xonobod", "Xonobod"],
  ["AND-04", "Andijon", "Shahrixon", "Shahrixon"],
  ["NMG-02", "Namangan", "Chust", "Chust"],
  ["NMG-03", "Namangan", "Pop", "Pop"],
  ["NMG-04", "Namangan", "Kosonsoy", "Kosonsoy"],
  ["BXR-02", "Buxoro", "Kogon", "Kogon"],
  ["BXR-03", "Buxoro", "G'ijduvon", "G'ijduvon"],
  ["BXR-04", "Buxoro", "Vobkent", "Vobkent"],
  ["QSH-02", "Qashqadaryo", "Shahrisabz", "Shahrisabz"],
  ["QSH-03", "Qashqadaryo", "Kitob", "Kitob"],
  ["QSH-04", "Qashqadaryo", "G'uzor", "G'uzor"],
] as const;

/** Region → serving warehouses, districts, share of clients (weights). */
export const REGIONS: { name: string; warehouses: string[]; districts: string[]; weight: number }[] = [
  { name: "Toshkent", warehouses: ["TSH-01", "TSH-02"], weight: 30, districts: ["Yunusobod", "Chilonzor", "Sergeli", "Mirzo Ulug'bek", "Yakkasaroy", "Shayxontohur", "Olmazor", "Uchtepa", "Yashnobod", "Mirobod", "Bektemir", "Yangihayot"] },
  { name: "Toshkent viloyati", warehouses: ["TSH-02"], weight: 10, districts: ["Chirchiq", "Olmaliq", "Angren", "Nurafshon", "Bekobod", "Yangiyo'l", "Zangiota"] },
  { name: "Samarqand", warehouses: ["SMQ-01"], weight: 13, districts: ["Samarqand", "Urgut", "Kattaqo'rg'on", "Bulung'ur", "Jomboy", "Ishtixon", "Pastdarg'om"] },
  { name: "Farg'ona", warehouses: ["FRG-01"], weight: 11, districts: ["Farg'ona", "Marg'ilon", "Qo'qon", "Quva", "Rishton", "Oltiariq"] },
  { name: "Andijon", warehouses: ["AND-01"], weight: 9, districts: ["Andijon", "Asaka", "Xonobod", "Shahrixon", "Baliqchi"] },
  { name: "Namangan", warehouses: ["NMG-01"], weight: 9, districts: ["Namangan", "Chust", "Pop", "Kosonsoy", "Uychi"] },
  { name: "Buxoro", warehouses: ["BXR-01"], weight: 9, districts: ["Buxoro", "Kogon", "G'ijduvon", "Vobkent", "Romitan"] },
  { name: "Qashqadaryo", warehouses: ["QSH-01"], weight: 9, districts: ["Qarshi", "Shahrisabz", "Kitob", "G'uzor", "Koson"] },
];

export const SHOP_NAMES = ["Korzinka", "Makro", "Havas", "Baraka", "Oila", "Family", "Next", "Mega", "Yangi Hayot", "Chorsu", "Bahor", "Nur", "Zamzam", "Asl", "Diyor", "Safia", "Imkon", "Orzu", "Navro'z", "Ziyo", "Barakat", "Tong", "Saodat", "Iftixor", "Do'stlik", "Ishonch", "Sahovat", "Mehr", "Oltin Vodiy", "Bunyod"];
export const SHOP_TYPES = ["Market", "Savdo", "Minimarket", "Supermarket", "do'koni", "Mart", "Plaza", "Express"];

export const FIRST_NAMES = ["Alisher", "Kamola", "Rustam", "Dilnoza", "Sherzod", "Malika", "Anvar", "Gulnora", "Bobur", "Nodira", "Jasur", "Madina", "Otabek", "Zarina", "Sardor", "Nilufar", "Javohir", "Shahlo", "Ulug'bek", "Feruza", "Farrux", "Laylo", "Islom", "Sevara", "Akmal", "Dildora", "Behruz", "Munisa", "Temur", "Mohira", "Azizbek", "Gulchehra", "Doniyor", "Iroda", "Elyor", "Komila", "Jahongir", "Robiya", "Mirjalol", "Shoira", "Nodirbek", "Umida", "Sanjar", "Hilola", "Bekzod", "Zuhra", "Davron", "Mavluda", "Shohruh", "Yulduz"];
/** Female first names take the feminine surname form (Karimov → Karimova). */
export const FEMALE = new Set(["Kamola", "Dilnoza", "Malika", "Gulnora", "Nodira", "Madina", "Zarina", "Nilufar", "Shahlo", "Feruza", "Laylo", "Sevara", "Dildora", "Munisa", "Mohira", "Gulchehra", "Iroda", "Komila", "Robiya", "Shoira", "Umida", "Hilola", "Zuhra", "Mavluda", "Yulduz"]);
export const LAST_NAMES = ["Karimov", "Toshev", "Nazarov", "Ismoilov", "Rasulov", "Yusupov", "Qodirov", "Ergashev", "Xolmatov", "Nematov", "Hamidov", "Soliyev", "Qosimov", "Saidov", "Mirzayev", "Usmonov", "Aliyev", "Rahimov", "Tursunov", "Sobirov", "Abdullayev", "Jo'rayev", "Hakimov", "Sultonov", "Raxmonov", "Valiyev", "Islomov", "Normatov", "Ibragimov", "Haydarov", "Botirov", "Ortiqov", "Fayziyev", "Sharipov", "Yo'ldoshev", "Zokirov", "Mamatov", "Xudoyberdiyev", "Eshonqulov", "Po'latov"];

type Base = [label: string, unit: string, weightKg: number, price: number];
/** Product families: every brand × every base becomes one SKU. */
export const FAMILIES: { category: string; brands: string[]; bases: Base[] }[] = [
  {
    category: "Ichimliklar",
    brands: ["Coca-Cola", "Pepsi", "Fanta", "Sprite", "7Up", "Mirinda", "Bonaqua", "Hydrolife", "Nestle Pure Life", "Montella"],
    bases: [["0.33L banka", "dona", 0.36, 7000], ["0.5L", "dona", 0.55, 6000], ["1L", "dona", 1.05, 9500], ["1.5L", "dona", 1.6, 12000], ["2L", "dona", 2.1, 15000]],
  },
  {
    category: "Sharbatlar",
    brands: ["Rich", "Dena", "Bliss", "Sandora", "Gracio", "Dinay"],
    bases: [["olma sharbati 1L", "dona", 1.05, 16000], ["apelsin sharbati 1L", "dona", 1.05, 17000], ["shaftoli nektari 1L", "dona", 1.05, 15000], ["multifrukt 1L", "dona", 1.05, 16500], ["olcha nektari 0.2L", "dona", 0.22, 5000]],
  },
  {
    category: "Choy va qahva",
    brands: ["Lipton", "Ahmad Tea", "Greenfield", "Tess", "Akbar", "Nescafe", "Jacobs", "MacCoffee"],
    bases: [["qora choy 100 paket", "quti", 0.25, 28000], ["ko'k choy 25 paket", "quti", 0.06, 14000], ["choy 250g", "dona", 0.26, 32000], ["eriydigan qahva 95g", "dona", 0.12, 52000], ["3 in 1 qahva 10 paket", "quti", 0.2, 18000]],
  },
  {
    category: "Sut mahsulotlari",
    brands: ["Musaffo", "Nestle", "Lactel", "Bio Balance", "Prostokvashino", "Milky Way", "Fresh Milk"],
    bases: [["sut 3.2% 1L", "dona", 1.05, 13000], ["sut 2.5% 0.9L", "dona", 0.95, 11500], ["qatiq 450g", "dona", 0.47, 9000], ["kefir 1L", "dona", 1.05, 12500], ["smetana 20% 400g", "dona", 0.42, 18000], ["tvorog 9% 200g", "dona", 0.21, 14000], ["yogurt 125g", "dona", 0.13, 6500]],
  },
  {
    category: "Pishloqlar",
    brands: ["Hochland", "Lactel", "Valio", "President", "Arla"],
    bases: [["eritilgan pishloq 200g", "dona", 0.21, 26000], ["gauda 250g", "dona", 0.26, 42000], ["mozzarella 125g", "dona", 0.13, 28000], ["cheddar 200g", "dona", 0.21, 39000]],
  },
  {
    category: "Oziq-ovqat",
    brands: ["Makfa", "Barilla", "Oltin don", "Sof", "Lazer", "Mistral"],
    bases: [["makaron 400g", "dona", 0.41, 11000], ["spagetti 500g", "dona", 0.51, 14000], ["guruch 1kg", "dona", 1, 26000], ["grechka 900g", "dona", 0.9, 22000], ["un 2kg", "dona", 2, 19000], ["manka 800g", "dona", 0.8, 12000], ["no'xat 900g", "dona", 0.9, 17000]],
  },
  {
    category: "Yog' va shakar",
    brands: ["Oltin", "Sof", "Zolotaya semechka", "Ideal", "Floriol"],
    bases: [["kungaboqar yog'i 1L", "dona", 0.95, 24000], ["kungaboqar yog'i 5L", "dona", 4.7, 112000], ["paxta yog'i 1L", "dona", 0.95, 22000], ["margarin 250g", "dona", 0.26, 9000], ["shakar 1kg", "dona", 1, 14000]],
  },
  {
    category: "Shirinliklar",
    brands: ["Snickers", "Mars", "Twix", "Bounty", "KitKat", "Alpen Gold", "Milka", "Roshen", "Crafers"],
    bases: [["batonchik 50g", "dona", 0.05, 8000], ["shokolad 90g", "dona", 0.09, 14000], ["konfet 200g", "quti", 0.2, 28000], ["vafli 300g", "dona", 0.3, 17000]],
  },
  {
    category: "Pechenye va snaklar",
    brands: ["Yubileynoe", "Oreo", "Tuc", "Barni", "Lay's", "Pringles", "Cheetos", "Kirieshki"],
    bases: [["pechenye 112g", "dona", 0.12, 9000], ["krekker 100g", "dona", 0.1, 8000], ["chips 150g", "dona", 0.15, 16000], ["mini paket 40g", "dona", 0.04, 5000]],
  },
  {
    category: "Konserva",
    brands: ["Bonduelle", "Heinz", "Fortuna", "Tuna Bay", "Sof konserva"],
    bases: [["pomidor pastasi 380g", "dona", 0.42, 15000], ["tuna 185g", "dona", 0.2, 22000], ["yashil no'xat 400g", "dona", 0.42, 13000], ["makkajo'xori 340g", "dona", 0.36, 14000], ["lobiya 400g", "dona", 0.42, 15000]],
  },
  {
    category: "Souslar va ziravorlar",
    brands: ["Heinz", "Calve", "Maheev", "Sloboda", "Knorr"],
    bases: [["ketchup 350g", "dona", 0.37, 16000], ["mayonez 400g", "dona", 0.41, 18000], ["xantal 200g", "dona", 0.21, 9000], ["bulyon kubik 10 dona", "quti", 0.1, 7000]],
  },
  {
    category: "Maishiy kimyo",
    brands: ["Ariel", "Tide", "Persil", "Fairy", "Domestos", "Comet", "Mr Proper", "Vanish"],
    bases: [["kir yuvish kukuni 3kg", "dona", 3, 89000], ["kir yuvish geli 1.3L", "dona", 1.35, 69000], ["idish yuvish 500ml", "dona", 0.55, 19000], ["tozalovchi 1L", "dona", 1.1, 27000], ["oqartiruvchi 1L", "dona", 1.1, 21000]],
  },
  {
    category: "Gigiyena",
    brands: ["Colgate", "Blend-a-med", "Head & Shoulders", "Pantene", "Dove", "Nivea", "Safeguard", "Gillette"],
    bases: [["tish pastasi 100ml", "dona", 0.13, 17000], ["shampun 400ml", "dona", 0.43, 46000], ["sovun 90g", "dona", 0.1, 8000], ["dush geli 250ml", "dona", 0.27, 32000], ["dezodorant 150ml", "dona", 0.18, 36000]],
  },
  {
    category: "Muzlatilgan mahsulotlar",
    brands: ["Siberia", "Mavrin", "Ice Berg", "Polar", "Baraka"],
    bases: [["pelmen 800g", "paket", 0.8, 38000], ["chuchvara 1kg", "paket", 1, 42000], ["muzqaymoq 80g", "dona", 0.08, 6000], ["muzlatilgan sabzavot 400g", "paket", 0.4, 19000], ["kotlet 500g", "paket", 0.5, 36000]],
  },
  {
    category: "Go'sht va kolbasa",
    brands: ["Halol Go'sht", "Mavrin", "Sof Kolbasa", "Baraka Meat"],
    bases: [["qaynatilgan kolbasa 500g", "dona", 0.5, 45000], ["sosiska 400g", "paket", 0.4, 32000], ["dudlangan kolbasa 300g", "dona", 0.3, 52000], ["tovuq filesi 1kg", "kg", 1, 62000], ["mol qiymasi 500g", "paket", 0.5, 58000]],
  },
  {
    category: "Bolalar mahsulotlari",
    brands: ["Pampers", "Huggies", "Libero", "Nutrilon", "Frutonyanya"],
    bases: [["tagliklar 4 (50 dona)", "paket", 1.6, 165000], ["nam salfetka 64 dona", "paket", 0.35, 18000], ["bolalar pyuresi 90g", "dona", 0.1, 9000], ["sut aralashmasi 400g", "dona", 0.45, 135000]],
  },
  {
    category: "Non mahsulotlari",
    brands: ["Non Plus", "Toshkent Non", "Yupqa", "Xonim"],
    bases: [["lavash 10 dona", "paket", 0.5, 12000], ["tost noni 500g", "dona", 0.5, 11000], ["suxari 200g", "dona", 0.2, 7000], ["kruassan 6 dona", "paket", 0.36, 21000]],
  },
];

export const CITY_STREETS = ["Mustaqillik", "Navoiy", "Bobur", "Amir Temur", "Istiqlol", "Do'stlik", "Bunyodkor", "Mirzo Ulug'bek", "Alisher Navoiy", "Yangi Hayot"];

export const LEADS = [
  ["Fresh Distribution", "50 ta agent uchun demo kerak"],
  ["Sweet Line MChJ", "Ombor auditi moduli qiziqtiradi"],
  ["AquaPro", "Telegram bot integratsiyasi"],
  ["Mega Foods", ""],
  ["Vodiy Savdo", "1C bilan integratsiya bo'yicha savol"],
  ["Samarqand Trade", "Kuryerlar nazorati kerak"],
  ["Oltin Don Group", "Kredit limiti nazorati qiziqtiradi"],
  ["Barakat Distribyutor", "Narxlar va tariflar"],
  ["Navro'z Food", "Payme va Click to'lovlari"],
  ["Nur Logistics", "Bir nechta ombor uchun hisob"],
] as const;
