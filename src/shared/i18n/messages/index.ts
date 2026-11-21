import { admin } from "./admin";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { mobile } from "./mobile";
import { sales } from "./sales";
import { shell } from "./shell";
import type { Messages } from "./types";
import { warehouse } from "./warehouse";

export const MESSAGES = { ...common, ...shell, ...dashboard, ...sales, ...warehouse, ...admin, ...mobile };
export type MsgKey = keyof typeof MESSAGES;
export const messages: Messages = MESSAGES;
