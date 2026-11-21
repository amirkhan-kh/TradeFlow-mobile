import express, { Router } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config } from "./core/config.js";
import { requireAuth } from "./core/auth.js";
import { pool } from "./core/db.js";
import { errorHandler, notFound } from "./core/http.js";
import { activityRouter } from "./modules/activity/router.js";
import { agentsRouter } from "./modules/agents/router.js";
import { appVersionRouter } from "./modules/app/router.js";
import { auditsRouter } from "./modules/audits/router.js";
import { authRouter } from "./modules/auth/router.js";
import { clientsRouter } from "./modules/clients/router.js";
import { dashboardRouter } from "./modules/dashboard/router.js";
import { deliveriesRouter } from "./modules/deliveries/router.js";
import { insightsRouter } from "./modules/insights/router.js";
import { integrationsPublicRouter } from "./modules/integrations/public.js";
import { integrationsRouter } from "./modules/integrations/router.js";
import { leadsPublicRouter, leadsRouter } from "./modules/leads/router.js";
import { ordersRouter } from "./modules/orders/router.js";
import { paymentsRouter } from "./modules/payments/router.js";
import { productsRouter } from "./modules/products/router.js";
import { stockRouter } from "./modules/stock/router.js";
import { usersRouter } from "./modules/users/router.js";
import { warehousesRouter } from "./modules/warehouses/router.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback, linklocal, uniquelocal");
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  });

  const api = Router();
  api.use("/auth", authRouter);
  api.use("/public/leads", leadsPublicRouter);
  api.use("/public/app-version", appVersionRouter);
  api.use("/public/integrations", integrationsPublicRouter);

  const secured = Router();
  secured.use(requireAuth);
  secured.use("/dashboard", dashboardRouter);
  secured.use("/insights", insightsRouter);
  secured.use("/users", usersRouter);
  secured.use("/warehouses", warehousesRouter);
  secured.use("/products", productsRouter);
  secured.use("/stock", stockRouter);
  secured.use("/clients", clientsRouter);
  secured.use("/orders", ordersRouter);
  secured.use("/deliveries", deliveriesRouter);
  secured.use("/payments", paymentsRouter);
  secured.use("/audits", auditsRouter);
  secured.use("/agents", agentsRouter);
  secured.use("/leads", leadsRouter);
  secured.use("/integrations", integrationsRouter);
  secured.use("/activity", activityRouter);
  api.use(secured);

  app.use("/api/v1", api);
  app.use((_req, _res, next) => next(notFound()));
  app.use(errorHandler);
  return app;
}
