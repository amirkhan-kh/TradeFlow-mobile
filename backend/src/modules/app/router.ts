import { Router } from "express";
import { config } from "../../core/config.js";

/** Public: version gate read by the mobile app on start. */
export const appVersionRouter = Router();

appVersionRouter.get("/", (_req, res) => {
  res.json(config.mobile);
});
