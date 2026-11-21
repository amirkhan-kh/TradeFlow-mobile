import { Router } from "express";
import { langOf } from "../../core/i18n.js";
import { run } from "./service.js";

export const insightsRouter = Router();

insightsRouter.get("/", async (req, res) => {
  res.json(await run(langOf(req)));
});
