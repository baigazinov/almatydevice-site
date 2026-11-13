// Приёмник заказов с Тильды: Тильда → этот адрес (вебхук) → заказ в CRM.
// Выкладка: supabase functions deploy tilda-order --no-verify-jwt
// Адрес с ключом для Тильды показывает админка в разделе «Тильда».

type Obj = Record<string, unknown>;

const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Тильда шлёт данные формой (payment[products][0][name]=…) или JSON — приводим к одному объекту
export function parseBody(text: string, contentType: string): Obj {
  const t = text.trim();
  if (contentType.includes("json") || t.startsWith("{")) {
    try {
      const j = JSON.parse(t);
      if (j && typeof j === "object" && !Array.isArray(j)) return arrayify(j) as Obj;
    } catch { /* не JSON — разбираем как форму */ }
  }
  const out: Obj = {};
  for (const [key, value] of new URLSearchParams(text)) {
    const m = key.match(/^([^[\]]+)((?:\[[^\]]*\])*)$/);
    const path = m ? [m[1], ...[...m[2].matchAll(/\[([^\]]*)\]/g)].map((x) => x[1])] : [key];
    if (path.some((p) => BAD_KEYS.has(p))) continue;
    let o = out;
    path.forEach((p, i) => {
      if (p === "") p = String(Object.keys(o).length);   // a[]=1&a[]=2
      if (i === path.length - 1) o[p] = value;
      else {
        if (typeof o[p] !== "object" || o[p] === null) o[p] = {};
        o = o[p] as Obj;
      }
    });
  }
  return arrayify(out) as Obj;
}

// {"0":…,"1":…} → […]
function arrayify(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(arrayify);
  if (!v || typeof v !== "object") return v;
  const o = v as Obj, keys = Object.keys(o);
  const fixed: Obj = {};
  for (const k of keys) if (!BAD_KEYS.has(k)) fixed[k] = arrayify(o[k]);
  if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
    return keys.sort((a, b) => +a - +b).map((k) => fixed[k]);
  }
  return fixed;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v)).trim();
export const num = (v: unknown): number | null => {
  const s = str(v).replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (!s || isNaN(+s)) return null;
  return Math.round(+s);
};
// служебные поля Тильды — не данные покупателя
const TECH = /^(formid|formname|tranid|cookies|test|payment|orderid|utm_.*|referer|ip)$/i;
// поле формы по одному из имён, без учёта регистра (Name, name, Имя…)
function field(d: Obj, names: string[], contains: string[] = []): string {
  const keys = Object.keys(d).filter((k) => !TECH.test(k) && (typeof d[k] === "string" || typeof d[k] === "number"));
  for (const n of names) {
    const k = keys.find((k) => k.toLowerCase() === n);
    if (k && str(d[k])) return str(d[k]);
  }
  for (const c of contains) {
    const k = keys.find((k) => k.toLowerCase().includes(c));
    if (k && str(d[k])) return str(d[k]);
  }
  return "";
}

type Item = { name: string; qty: number; price: number };

// товар: объект {name, quantity, price, amount, options} или строка «Товар: 10000 (1 x 10000) Цвет: Черный»
export function parseItem(p: unknown): Item {
  if (p && typeof p === "object") {
    const o = p as Obj;
    const qty = num(o.quantity ?? o.qty) || 1;
    const price = num(o.price) ?? (num(o.amount) !== null ? Math.round(num(o.amount)! / qty) : 0);
    const opts = Array.isArray(o.options)
      ? (o.options as Obj[]).map((x) => [str(x?.option), str(x?.variant)].filter(Boolean).join(": ")).filter(Boolean).join(", ")
      : "";
    const name = str(o.name || o.title) || "Товар";
    return { name: opts ? `${name} (${opts})` : name, qty, price: price || 0 };
  }
  const s = str(p).replace(/^\d+\.\s+/, "");
  const m = s.match(/^(.*?):\s*([\d\s.,]+)\s*\(\s*(\d+)\s*[xх×]\s*([\d\s.,]+)\)\s*(.*)$/i);
  if (m) {
    const rest = m[5].trim();
    return { name: rest ? `${m[1].trim()} (${rest})` : m[1].trim(), qty: +m[3] || 1, price: num(m[4]) || 0 };
  }
  return { name: s || "Товар", qty: 1, price: 0 };
}

// «Курьер по Алматы = 2000» → название и цена
function splitDelivery(s: string): { name: string; price: number | null } {
  const m = s.match(/^(.*?)\s*=\s*([\d\s.,]+)\s*(?:₸|тг|тенге|kzt)?\.?$/i);
  return m ? { name: m[1].trim(), price: num(m[2]) } : { name: s, price: null };
}

export function isTest(d: Obj): boolean {
  return str(d.test).toLowerCase() === "test";
}

// данные Тильды → заказ для tilda_order()
export function normalize(d: Obj) {
  let pay = d.payment as unknown;
  if (typeof pay === "string") {
    try { pay = JSON.parse(pay); } catch { pay = {}; }
  }
  const p = (pay && typeof pay === "object" ? pay : {}) as Obj;
  const products = Array.isArray(p.products) ? p.products : typeof p.products === "string" ? [p.products] : [];
  const items = products.map(parseItem);

  const del = splitDelivery(str(p.delivery) || field(d, ["delivery", "deliveryvar", "доставка", "способ доставки"]));
  const deliveryCost = num(p.delivery_price) ?? del.price ?? 0;
  const total = num(p.amount);
  const subtotal = num(p.subtotal) ?? items.reduce((s, i) => s + i.price * i.qty, 0);
  let discount = num(p.discountvalue);
  if (discount === null && total !== null) discount = Math.max(subtotal + deliveryCost - total, 0);

  return {
    external_id: str(p.orderid) || str(d.orderid) || str(d.tranid) || null,
    name: field(d, ["name", "имя", "fio", "фио", "ваше имя"], ["name", "имя"]) || str(p.delivery_fio),
    phone: field(d, ["phone", "телефон", "tel", "ваш телефон"], ["phone", "телефон"]),
    email: field(d, ["email", "e-mail", "почта"], ["mail"]),
    items,
    total,
    discount: discount ?? 0,
    promo: str(p.promocode) || field(d, ["promocode", "промокод"]),
    delivery_name: del.name || null,
    delivery_cost: deliveryCost,
    city: str(p.delivery_city) || field(d, ["city", "город"]),
    address: str(p.delivery_address) || field(d, ["address", "адрес"], ["адрес", "address"]),
    comment: str(p.delivery_comment) || field(d, ["comment", "comments", "комментарий"], ["коммент", "comment"]),
    payment_id: str(p.systranid) || null,
  };
}

function serviceKey(): string {
  const env = (k: string) => (globalThis as any).Deno?.env.get(k) || "";
  if (env("SUPABASE_SERVICE_ROLE_KEY")) return env("SUPABASE_SERVICE_ROLE_KEY");
  try {   // проекты только с новыми ключами
    const keys = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}");
    return keys.default || Object.values(keys)[0] || "";
  } catch { return ""; }
}

export async function handle(req: Request): Promise<Response> {
  const text = (s: string, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  // GET — проверка из админки, что приёмник выложен
  if (req.method !== "POST") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  const body = await req.text();
  if (body.length > 300_000) return text("too large", 413);
  const data = parseBody(body, req.headers.get("content-type") || "");
  const key = new URL(req.url).searchParams.get("key") || "";

  const sk = serviceKey();
  const url = (globalThis as any).Deno?.env.get("SUPABASE_URL");
  const headers: Record<string, string> = { apikey: sk, "Content-Type": "application/json" };
  if (sk.startsWith("eyJ")) headers.Authorization = `Bearer ${sk}`;
  const r = await fetch(`${url}/rest/v1/rpc/tilda_order`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_key: key, p_order: isTest(data) ? null : normalize(data), p_raw: data }),
  });
  if (r.ok) return text("ok");
  const err = await r.text();
  console.error("tilda_order failed", r.status, err);
  return err.includes("Неверный ключ") ? text("wrong key", 403) : text("error", 500);
}

if (typeof (globalThis as any).Deno?.serve === "function") (globalThis as any).Deno.serve(handle);
