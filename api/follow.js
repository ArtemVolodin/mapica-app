"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/follow.ts
var follow_exports = {};
__export(follow_exports, {
  default: () => handler
});
module.exports = __toCommonJS(follow_exports);

// lib/env.ts
function readEnv(source) {
  const from = source ?? (typeof process !== "undefined" ? process.env : {});
  return {
    SUPABASE_URL: from.SUPABASE_URL,
    SUPABASE_ANON_KEY: from.SUPABASE_ANON_KEY,
    SITE_URL: from.SITE_URL,
    APP_STORE_URL: from.APP_STORE_URL,
    PLAY_STORE_URL: from.PLAY_STORE_URL
  };
}

// api/follow.ts
var DEFAULT_SUPABASE_URL = "https://qsstbssltuzglvtrpkvh.supabase.co";
async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  const creatorId = String(
    req.body?.creator_id ?? ""
  ).trim();
  if (!creatorId) {
    res.status(400).json({ error: "creator_id_required" });
    return;
  }
  const env = readEnv(process.env);
  const base = (env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const anon = env.SUPABASE_ANON_KEY ?? "";
  if (!anon) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }
  try {
    const upstream = await fetch(`${base}/rest/v1/rpc/toggle_creator_follow`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_creator_id: creatorId })
    });
    const text = await upstream.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }
    if (!upstream.ok) {
      res.status(upstream.status).json(payload ?? { error: "follow_failed" });
      return;
    }
    res.status(200).json(payload);
  } catch (error) {
    console.error("follow api error", error);
    res.status(502).json({ error: "follow_service_unavailable" });
  }
}
