import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { config } from "./config.js";
import { pool, tx } from "./db.js";
import { HttpError } from "./http.js";
import { BRANCHES, CITY_STREETS, FAMILIES, FEMALE, FIRST_NAMES, LAST_NAMES, LEADS, REGIONS, SHOP_NAMES, SHOP_TYPES, WAREHOUSES } from "./seed-data.js";
import * as users from "../modules/users/repository.js";
import * as orders from "../modules/orders/repository.js";
import { applyStatus } from "../modules/orders/service.js";
import * as audits from "../modules/audits/repository.js";
import { approveIn } from "../modules/audits/service.js";
import { changeBalance } from "../modules/clients/repository.js";

let state = 20261007;
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const digits = (n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? int(1, 9) : int(0, 9))).join("");
const phone = () => `+998 ${pick(["90", "91", "93", "94", "95", "97", "99", "33", "88"])} ${int(100, 999)} ${int(10, 99)} ${int(10, 99)}`;

const DAYS = 365;
/** 502 staff + admin; ~6 outlets per agent. */
const COUNTS = { managers: 14, agents: 320, couriers: 120, auditors: 48, clients: 1800, leads: 600 };
/** Order volume and stock targets scale together, so the history stays mostly fulfilled. */
const VOLUME = 2.5;

/** History never runs ahead of the clock: today's events land in the past hours. */
const notAfterNow = (d: Date) => (d.getTime() > Date.now() ? new Date(Date.now() - int(5, 180) * 60_000) : d);

const day = (offset: number, hour = int(8, 18)) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, int(0, 59), 0, 0);
  return offset > 0 ? d : notAfterNow(d);
};

function fullName() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return `${first} ${FEMALE.has(first) ? `${last}a` : last}`;
}

/** Unique "First Last" names, deterministic order. */
function people(count: number, used: Set<string>) {
  const out: string[] = [];
  while (out.length < count) {
    const name = fullName();
    if (used.has(name)) continue;
    used.add(name);
    out.push(name);
  }
  return out;
}

/** Picks by weight with a prebuilt cumulative table (binary search). */
function weighted<T>(items: T[], weight: (t: T) => number) {
  const cum: number[] = [];
  let sum = 0;
  for (const it of items) cum.push((sum += weight(it)));
  return () => {
    const r = rand() * sum;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return items[lo];
  };
}

async function seedStaff(db: PoolClient, hash: string) {
  const used = new Set<string>();
  const insert = (username: string, full_name: string, role: string, extra: { region?: string; monthly_plan?: number } = {}) =>
    users.insert(db, { username, password_hash: hash, full_name, role: role as "agent", phone: phone(), ...extra });

  for (const [i, name] of people(COUNTS.managers, used).entries()) await insert(i === 0 ? "manager" : `manager${i + 1}`, name, "manager");

  const regionPick = weighted(REGIONS, (r) => r.weight);
  const agentsByRegion: Record<string, number[]> = {};
  const agentNames = people(COUNTS.agents, used);
  for (const [i, name] of agentNames.entries()) {
    // first agent of every region is assigned deterministically so no region is left without one
    const region = i < REGIONS.length ? REGIONS[i].name : regionPick().name;
    const u = await insert(`agent${i + 1}`, name, "agent", { region, monthly_plan: int(8, 24) * 5_000_000 });
    (agentsByRegion[region] ??= []).push(u.id);
  }

  const couriers: number[] = [];
  for (const [i, name] of people(COUNTS.couriers, used).entries()) couriers.push((await insert(`courier${i + 1}`, name, "courier")).id);
  const auditors: number[] = [];
  for (const [i, name] of people(COUNTS.auditors, used).entries()) auditors.push((await insert(`auditor${i + 1}`, name, "auditor")).id);
  return { agentsByRegion, couriers, auditors };
}

async function seedProducts(db: PoolClient) {
  const rows: { sku: string; name: string; category: string; unit: string; weight: number; price: number; min: number; popularity: number; expires: string | null }[] = [];
  for (const { category, brands, bases } of FAMILIES) {
    for (const brand of brands) {
      const factor = 0.85 + rand() * 0.4;
      for (const [label, unit, weight, base] of bases) {
        const popularity = 0.15 + rand() ** 2 * 1.85;
        const perishable = /sut|qatiq|kefir|smetana|tvorog|yogurt|non|lavash|kolbasa|sosiska|filesi|qiyma/.test(label);
        rows.push({
          sku: `TF-${1001 + rows.length}`,
          name: `${brand} ${label}`,
          category,
          unit,
          weight,
          price: Math.round((base * factor) / 100) * 100,
          min: Math.max(5, Math.round(10 + popularity * 25)),
          popularity,
          expires: perishable && rand() < 0.25 ? day(int(5, 40)).toISOString().slice(0, 10) : null,
        });
      }
    }
  }
  const { rows: ids } = await db.query<{ id: number; sku: string }>(
    `INSERT INTO products (sku, name, category, unit, weight_kg, price, cost, min_stock, expires_at, ikpu, package_code, vat_rate)
     SELECT t.sku, t.name, t.category, t.unit, t.weight, t.price, round(t.price * 0.78), t.min, t.expires, t.ikpu, t.pkg, 12
     FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::numeric[], $6::numeric[], $7::int[], $8::date[], $9::text[], $10::text[])
       AS t(sku, name, category, unit, weight, price, min, expires, ikpu, pkg)
     RETURNING id, sku`,
    [
      rows.map((r) => r.sku),
      rows.map((r) => r.name),
      rows.map((r) => r.category),
      rows.map((r) => r.unit),
      rows.map((r) => r.weight),
      rows.map((r) => r.price),
      rows.map((r) => r.min),
      rows.map((r) => r.expires),
      rows.map(() => (rand() < 0.7 ? digits(17) : null)),
      rows.map(() => (rand() < 0.7 ? digits(7) : null)),
    ],
  );
  const bySku = new Map(rows.map((r) => [r.sku, r]));
  return ids.map(({ id, sku }) => ({ id, price: bySku.get(sku)!.price, popularity: bySku.get(sku)!.popularity }));
}

async function seedClients(db: PoolClient, wh: Record<string, number>, agentsByRegion: Record<string, number[]>) {
  const regionPick = weighted(REGIONS, (r) => r.weight);
  const names = new Set<string>();
  const list: { name: string; owner: string; phone: string; region: string; district: string; address: string; segment: string; agent: number; limit: number; inn: string | null; created: Date }[] = [];
  while (list.length < COUNTS.clients) {
    const region = list.length < REGIONS.length ? REGIONS[list.length] : regionPick();
    const district = pick(region.districts);
    const name = `${pick(SHOP_NAMES)} ${pick(SHOP_TYPES)} ${district}`;
    if (names.has(name)) continue;
    names.add(name);
    const segment = pick(["A", "A", "B", "B", "B", "C"]);
    list.push({
      name,
      owner: fullName(),
      phone: phone(),
      region: region.name,
      district,
      address: `${district}, ${pick(CITY_STREETS)} ko'chasi ${int(1, 180)}-uy`,
      segment,
      agent: pick(agentsByRegion[region.name]),
      limit: segment === "A" ? 80_000_000 : segment === "B" ? 40_000_000 : 15_000_000,
      inn: rand() < 0.6 ? digits(9) : null,
      created: day(-DAYS - int(0, 120), 10),
    });
  }
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO clients (name, owner_name, phone, region, address, segment, agent_id, credit_limit, inn, created_at)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::int[], $8::numeric[], $9::text[], $10::timestamptz[])
     RETURNING id`,
    [
      list.map((c) => c.name),
      list.map((c) => c.owner),
      list.map((c) => c.phone),
      list.map((c) => c.region),
      list.map((c) => c.address),
      list.map((c) => c.segment),
      list.map((c) => c.agent),
      list.map((c) => c.limit),
      list.map((c) => c.inn),
      list.map((c) => c.created),
    ],
  );
  const regionWh = Object.fromEntries(REGIONS.map((r) => [r.name, r.warehouses.map((c) => wh[c])]));
  const branchWh = Object.fromEntries(BRANCHES.map(([code, , district]) => [district, wh[code]]));
  return rows.map((r, i) => ({
    id: r.id,
    agent: list[i].agent,
    warehouses: branchWh[list[i].district] ? [...regionWh[list[i].region], branchWh[list[i].district]] : regionWh[list[i].region],
    weight: list[i].segment === "A" ? 3 : list[i].segment === "B" ? 2 : 1,
  }));
}

/** Tops every product up to its target in one statement per warehouse; writes `in` movements. */
async function restock(db: PoolClient, warehouseId: number, targets: { id: number; target: number }[], skip: number[], at: Date, ref: string, userId: number) {
  await db.query(
    `WITH want AS (SELECT * FROM unnest($2::int[], $3::int[]) AS t(product_id, target)),
     need AS (
       SELECT w.product_id, w.target - COALESCE(s.quantity, 0) AS qty
       FROM want w LEFT JOIN stock s ON s.warehouse_id = $1 AND s.product_id = w.product_id
       WHERE w.target - COALESCE(s.quantity, 0) > w.target * 0.35 AND NOT (w.product_id = ANY($4::int[]))
     ),
     up AS (
       INSERT INTO stock (warehouse_id, product_id, quantity) SELECT $1, product_id, qty FROM need
       ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity
     )
     INSERT INTO stock_movements (type, warehouse_id, product_id, quantity, reference, note, user_id, created_at)
     SELECT 'in', $1, product_id, qty, $5, 'Yetkazib beruvchidan kirim', $6, $7 FROM need`,
    [warehouseId, targets.map((t) => t.id), targets.map((t) => t.target), skip, ref, userId, at],
  );
}

async function seedDemo(db: PoolClient, adminId: number) {
  const hash = await bcrypt.hash("demo123", 10);
  const { agentsByRegion, couriers, auditors } = await seedStaff(db, hash);

  const wh: Record<string, number> = {};
  for (const [code, name, city, address, capacity, manager] of WAREHOUSES) {
    const { rows } = await db.query(
      `INSERT INTO warehouses (code, name, city, address, capacity, manager_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [code, name, city, address, capacity, manager],
    );
    wh[code] = rows[0].id;
  }
  for (const [code, , district, city] of BRANCHES) {
    const { rows } = await db.query(
      `INSERT INTO warehouses (code, name, city, address, capacity, manager_name) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [code, `${district} filiali`, city, `${district}, ${pick(CITY_STREETS)} ko'chasi ${int(1, 120)}`, int(60, 75) * 1000, fullName()],
    );
    wh[code] = rows[0].id;
  }
  const branchCodes = new Set<string>(BRANCHES.map(([code]) => code));
  const products = await seedProducts(db);
  const priceOf = new Map(products.map((p) => [p.id, p.price]));
  const popOf = new Map(products.map((p) => [p.id, p.popularity]));
  const clients = await seedClients(db, wh, agentsByRegion);

  const targets = Object.fromEntries(
    Object.entries(wh).map(([code, id]) => {
      const scale = code === "TSH-01" ? 1.6 : code === "TSH-02" ? 1.2 : branchCodes.has(code) ? 0.3 : 0.8;
      return [id, products.map((p) => ({ id: p.id, target: Math.round((25 + 110 * p.popularity) * scale * VOLUME) }))];
    }),
  );
  const scarce = products.filter((_, i) => i % 37 === 0).map((p) => p.id);
  const productPick = weighted(products, (p) => p.popularity);
  const clientPick = weighted(clients, (c) => c.weight);
  const vehicles = ["01 A 123 BC", "01 B 777 AA", "30 C 456 DA", "40 D 210 FA", "70 E 905 KA", "50 F 318 HA"];
  const auditCodes = Object.keys(wh);

  const START = -DAYS;
  for (let offset = START; offset <= 0; offset++) {
    if ((offset - START) % 7 === 0) {
      for (const id of Object.values(wh)) await restock(db, id, targets[id], offset > -18 ? scarce : [], day(offset, 7), `KIR-${offset + 2000}`, adminId);
    }

    const growth = 0.55 + 0.45 * ((offset - START) / -START);
    const weekend = day(offset).getDay() === 0;
    const count = Math.round((weekend ? int(1, 4) : int(12, 20) * growth) * VOLUME);

    for (let k = 0; k < count; k++) {
      const client = clientPick();
      const created = day(offset);
      const lines = new Map<number, number>();
      for (let n = int(2, 6); n > 0; n--) {
        const p = productPick();
        lines.set(p.id, (lines.get(p.id) ?? 0) + Math.max(1, Math.round(int(3, 24) * popOf.get(p.id)!)));
      }
      const items = [...lines].map(([product_id, quantity]) => ({ product_id, quantity, price: priceOf.get(product_id)! }));
      const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
      const discount = pick([0, 0, 0, 2, 3, 5]);
      const order = await orders.insert(
        db,
        { client_id: client.id, agent_id: client.agent, warehouse_id: pick(client.warehouses), subtotal, discount_pct: discount, total: Math.round(subtotal * (1 - discount / 100)), created_at: created },
        items,
      );

      const age = -offset;
      const step = (h: number) => new Date(Math.min(created.getTime() + h * 3600_000, Date.now()));
      try {
        await db.query("SAVEPOINT o");
        if (rand() < 0.04 && age > 1) {
          await applyStatus(db, order.id, { status: "cancelled" }, adminId, step(2));
        } else {
          if (age === 0 && rand() < 0.5) {
            await db.query("RELEASE SAVEPOINT o");
            continue;
          }
          await applyStatus(db, order.id, { status: "confirmed" }, adminId, step(1));
          if (age === 0 && rand() < 0.5) {
            await db.query("RELEASE SAVEPOINT o");
            continue;
          }
          await applyStatus(db, order.id, { status: "shipped", courier_id: pick(couriers), vehicle: pick(vehicles) }, adminId, step(18));
          if (age <= 1 && rand() < 0.6) {
            if (rand() < 0.5) await db.query(`UPDATE deliveries SET status='on_route' WHERE order_id=$1`, [order.id]);
            await db.query("RELEASE SAVEPOINT o");
            continue;
          }
          if (rand() < 0.02) {
            await db.query(`UPDATE deliveries SET status='failed', note='Mijoz manzilda topilmadi' WHERE order_id=$1`, [order.id]);
          } else {
            await applyStatus(db, order.id, { status: "delivered" }, adminId, step(int(20, 40)));
          }
          if (rand() < 0.88 && age > 2) {
            const share = rand() < 0.75 ? 1 : 0.5;
            const amount = Math.round(order.total * share);
            const paidAt = step(24 * int(1, Math.min(age, 14)));
            if (paidAt < new Date()) {
              await db.query(
                `INSERT INTO payments (client_id, order_id, amount, method, user_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
                [client.id, order.id, amount, pick(["cash", "cash", "transfer", "card"]), adminId, paidAt],
              );
              await changeBalance(db, client.id, -amount);
            }
          }
        }
        await db.query("RELEASE SAVEPOINT o");
      } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        await db.query("ROLLBACK TO SAVEPOINT o");
        await db.query(`UPDATE orders SET status='cancelled', note='Qoldiq yetarli emas' WHERE id=$1`, [order.id]);
      }
    }

    // one planned audit every day, rotating warehouses and auditors; the last few stay "completed" awaiting approval
    if (offset < 0) {
      const n = offset - START;
      const at = day(offset, 9);
      const audit = await audits.insert(db, { warehouse_id: wh[auditCodes[n % auditCodes.length]], auditor_id: auditors[n % auditors.length], note: "Rejali inventarizatsiya", created_at: at });
      await db.query(
        `UPDATE audit_items SET counted = GREATEST(0, expected + CASE WHEN random() < 0.12 THEN floor(random() * 9)::int - 6 ELSE 0 END) WHERE audit_id=$1`,
        [audit.id],
      );
      await audits.setStatus(db, audit.id, "completed", new Date(at.getTime() + 6 * 3600_000));
      if (offset < -4) await approveIn(db, audit.id, adminId, new Date(at.getTime() + 26 * 3600_000));
    }
  }

  const live = await audits.insert(db, { warehouse_id: wh["FRG-01"], auditor_id: auditors[0], note: "Choraklik inventarizatsiya" });
  await db.query(
    `UPDATE audit_items SET counted = expected - CASE WHEN random() < 0.2 THEN 2 ELSE 0 END
     WHERE audit_id=$1 AND id IN (SELECT id FROM audit_items WHERE audit_id=$1 ORDER BY id LIMIT 25)`,
    [live.id],
  );

  // limits the manager later cut for the biggest debtors, so overlimit views have data
  await db.query(
    `UPDATE clients SET credit_limit = GREATEST(1000000, round(balance * 0.8 / 100000) * 100000)
     WHERE id IN (SELECT id FROM clients WHERE balance > 2000000 ORDER BY balance DESC LIMIT 8)`,
  );

  const leads = Array.from({ length: COUNTS.leads }, () => {
    const [company, message] = pick(LEADS);
    const age = int(0, DAYS);
    const status = age < 7 ? pick(["new", "new", "contacted"]) : pick(["contacted", "won", "lost", "lost", "won", "new"]);
    return { name: fullName(), phone: phone(), company: `${company}${rand() < 0.5 ? ` ${pick(REGIONS).name}` : ""}`, message, status, created: day(-age) };
  });
  await db.query(
    `INSERT INTO leads (name, phone, company, message, status, created_at)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::timestamptz[])`,
    [leads.map((l) => l.name), leads.map((l) => l.phone), leads.map((l) => l.company), leads.map((l) => l.message), leads.map((l) => l.status), leads.map((l) => l.created)],
  );

  // staff were hired before the seeded history starts; the activity log gets their hiring and recent logins
  await db.query(
    `UPDATE users SET created_at = now() - interval '1 day' * ($1 + floor(random() * 400)) WHERE role <> 'admin'`,
    [DAYS + 120],
  );
  await db.query(`UPDATE users SET password_changed_at = created_at WHERE role <> 'admin'`);
  await db.query(
    `INSERT INTO activity_log (actor_id, action, target_user_id, details, ip, created_at)
     SELECT $1, 'user.created', id, jsonb_build_object('role', role, 'username', username), '10.10.0.' || (2 + id % 200), created_at
     FROM users WHERE role <> 'admin'`,
    [adminId],
  );
  await db.query(
    `WITH logins AS (
       SELECT u.id, u.role, now() - random() * interval '30 days' AS at
       FROM users u CROSS JOIN LATERAL generate_series(1, 1 + floor(random() * 10)::int + 0 * u.id)
       WHERE u.role <> 'admin' AND u.active
     ), logged AS (
       INSERT INTO activity_log (actor_id, action, details, ip, created_at)
       SELECT id, 'auth.login',
              jsonb_build_object('agent', CASE WHEN role IN ('agent', 'courier')
                THEN 'Mozilla/5.0 (Linux; Android 13; SM-A346E) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36'
                ELSE 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' END),
              '84.54.' || floor(random() * 255)::int || '.' || floor(1 + random() * 254)::int, at
       FROM logins
     )
     UPDATE users u SET last_login_at = l.at FROM (SELECT id, max(at) AS at FROM logins GROUP BY id) l WHERE u.id = l.id`,
  );
}

export async function seed() {
  const { rows } = await pool.query("SELECT COUNT(*) FROM users");
  if (rows[0].count > 0) return;
  console.log("seeding…");
  const started = Date.now();
  await tx(async (db) => {
    const admin = await users.insert(db, {
      username: config.adminUsername,
      password_hash: await bcrypt.hash(config.adminPassword, 10),
      full_name: "Administrator",
      role: "admin",
    });
    if (config.seedDemo) await seedDemo(db, admin.id);
  });
  await pool.query("ANALYZE");
  console.log(`seed done in ${Math.round((Date.now() - started) / 1000)}s`);
}
