// Renders the HTML guides to PDF with Chromium.
// Usage: node docs/manual/src/render.cjs [mobile|web ...]
// Needs a Playwright install; PLAYWRIGHT_PATH points to its package (default: the web repo's copy).
const path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/Users/amirxon/Desktop/tradeflow/frontend/node_modules/playwright");

const SRC = __dirname;
const OUT = path.resolve(SRC, "..");
const DOCS = {
  mobile: { html: "mobile.html", pdf: "TradeFlow-Rukovodstvo-1-Mobile.pdf", title: "TradeFlow Mobile — руководство пользователя" },
  web: { html: "web.html", pdf: "TradeFlow-Rukovodstvo-2-Web.pdf", title: "TradeFlow Web — руководство пользователя" },
};

const footer = (title) => `
  <div style="width:100%;font-family:Arial,sans-serif;font-size:7.5pt;color:#7a8780;padding:0 15mm;display:flex;justify-content:space-between;">
    <span>${title}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

(async () => {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DOCS);
  const browser = await chromium.launch();
  for (const key of which) {
    const d = DOCS[key];
    const page = await browser.newPage();
    await page.goto(`file://${path.join(SRC, d.html)}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(OUT, d.pdf),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footer(d.title),
    });
    console.log("pdf", d.pdf);
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
