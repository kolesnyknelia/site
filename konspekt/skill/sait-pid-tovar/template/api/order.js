/* Заявка з сайту → Telegram-група (+ LP-CRM, якщо налаштована). Для Vercel (адреса /api/order).
   Тут нічого міняти не треба: товар, ціни й ключі — в api/_config.js */
const C = require("./_config.js");

const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cut = (s, n) => Array.from(String(s == null ? "" : s)).slice(0, n).join("");

// LP-CRM приймає товари у форматі PHP serialize()
const phpStr = (v) => { v = String(v); return `s:${Buffer.byteLength(v, "utf8")}:"${v}";`; };
const phpProducts = (list) => `a:${list.length}:{` + list.map((o, i) => {
  const keys = Object.keys(o);
  return `i:${i};a:${keys.length}:{` + keys.map((k) => phpStr(k) + phpStr(o[k])).join("") + "}";
}).join("") + "}";
const phpUrlencode = (s) => encodeURIComponent(s).replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g, "+");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }

  if (b.website) return res.status(200).json({ ok: true, ref: "X" + Date.now(), total: 0 });

  const name = cut(String(b.name || "").replace(/<[^>]*>/g, "").trim(), 60);
  const phone = "+" + String(b.phone || "").replace(/\D/g, "");
  const qty = +b.qty === 2 ? 2 : 1;
  const utm = b.utm && typeof b.utm === "object" ? Object.fromEntries(Object.entries(b.utm).slice(0, 8)) : {};

  const digits = phone.length - 1;
  if (Array.from(name).length < 2 || digits < 10 || digits > 15) return res.status(400).json({ ok: false, error: "invalid" });

  const price = +C.price;
  const total = qty === 2 ? 2 * price - (+C.discount2 || 0) : price;
  const d = new Date(Date.now() + 3 * 3600e3); // приблизно київський час для номера заявки
  const p2 = (n) => String(n).padStart(2, "0");
  const ref = `${String(d.getUTCFullYear()).slice(2)}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}-${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}-${10 + Math.floor(Math.random() * 90)}`;
  const host = String(req.headers.host || "").replace(/[^a-z0-9.\-]/gi, "");
  const utmText = Object.entries(utm).map(([k, v]) => String(k).replace(/\W/g, "") + "=" + cut(v, 100));

  /* ---------- LP-CRM ---------- */
  let crm = "";
  if (C.lpcrmDomain && C.lpcrmKey) {
    const data = {
      key: C.lpcrmKey,
      order_id: String(Math.round(Date.now() / 100)),
      country: "UA",
      products: phpUrlencode(phpProducts([{ product_id: String(C.lpcrmProductId), price: String(Math.round(total / qty * 100) / 100), count: String(qty) }])),
      bayer_name: name,
      phone,
      comment: `${C.product} × ${qty} = ${total} грн · ${ref}`,
      site: host,
      ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()
    };
    if (C.lpcrmOffice) data.office = String(C.lpcrmOffice);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => { if (utm[k]) data[k] = cut(utm[k], 100); });
    const domain = String(C.lpcrmDomain).replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    try {
      const r = await fetch(`https://${domain}/api/addNewOrder.html`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data).toString(),
        signal: AbortSignal.timeout(12000)
      });
      const j = await r.json().catch(() => ({}));
      crm = j.status === "ok" ? "✅ передано в LP-CRM" : "⚠️ LP-CRM не прийняла заявку — внесіть вручну";
    } catch (e) { crm = "⚠️ LP-CRM не відповіла — внесіть вручну"; }
  }

  /* ---------- Telegram ---------- */
  const text = `🛒 <b>НОВА ЗАЯВКА — ${h(C.shop)}</b>\n\n`
    + `📦 ${h(C.product)}\n🔢 Кількість: <b>${qty} шт</b>\n💰 Сума: <b>${total} грн</b> + доставка\n\n`
    + `👤 ${h(name)}\n📞 ${h(phone)}\n\n`
    + `📊 ${h(utmText.length ? utmText.join(" · ") : "прямий захід")}\n🌐 ${h(host)} · 🧾 ${ref}`
    + (crm ? "\n" + crm : "");

  let tgOk = false;
  if (C.tgToken && C.tgChat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${C.tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: C.tgChat, text, parse_mode: "HTML", disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10000)
      });
      tgOk = r.ok;
    } catch (e) {}
  }

  if (!tgOk && !crm.startsWith("✅")) return res.status(502).json({ ok: false, error: "send" });
  return res.status(200).json({ ok: true, ref, total });
};
