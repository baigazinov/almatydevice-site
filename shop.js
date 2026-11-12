// Общие функции страниц оформления и заказа: запросы к базе, формат цен, корзина.
const CFG = window.AD_CONFIG || {};
export const DB = CFG.supabaseUrl && CFG.supabaseKey ? CFG.supabaseUrl.replace(/\/+$/, "") : "";
export const $ = s => document.querySelector(s);
export const fmt = n => Math.round(n || 0).toLocaleString("ru-RU") + " ₸";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function api(path, opts = {}){
  if(!DB) return Promise.reject(new Error("База не подключена"));
  const h = {apikey: CFG.supabaseKey, "Content-Type": "application/json"};
  if(CFG.supabaseKey.startsWith("eyJ")) h.Authorization = "Bearer " + CFG.supabaseKey;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), opts.timeout || 10000);
  return fetch(DB + "/rest/v1/" + path, {...opts, headers: h, signal: ctl.signal})
    .then(async r => {
      clearTimeout(t);
      const j = await r.json().catch(() => null);
      if(!r.ok) throw new Error((j && j.message) || "Ошибка сервера " + r.status);
      return j;
    }, e => { clearTimeout(t); throw new Error(e.name === "AbortError" ? "Сервер не ответил, проверьте интернет" : "Нет связи с сервером"); });
}
export const rpc = (fn, args) => api("rpc/" + fn, {method: "POST", body: JSON.stringify(args)});
export async function settings(){
  const r = await api("site_settings?select=data&id=eq.1");
  return (r[0] && r[0].data) || {};
}

// корзина хранится в браузере так же, как на главной странице
const read = (k, d) => { try{ const v = localStorage.getItem(k); return v === null ? d : v; }catch(e){ return d; } };
export const cart = {
  get(){ try{ return JSON.parse(read("ad-cart", "{}")) || {}; }catch(e){ return {}; } },
  set(c){ try{ localStorage.setItem("ad-cart", JSON.stringify(c)); }catch(e){} },
  promo(){ return read("ad-promo", "") || ""; },
  setPromo(code){ try{ code ? localStorage.setItem("ad-promo", code) : localStorage.removeItem("ad-promo"); }catch(e){} },
  clear(){ try{ localStorage.removeItem("ad-cart"); localStorage.removeItem("ad-promo"); }catch(e){} }
};
export const contact = {
  get(){ try{ return JSON.parse(read("ad-contact", "{}")) || {}; }catch(e){ return {}; } },
  set(v){ try{ localStorage.setItem("ad-contact", JSON.stringify(v)); }catch(e){} }
};
// Онлайн-оплата. Пока в настройках режим "manual", оплату подтверждает менеджер.
// Когда подключим банк, серверная функция create-payment вернёт ссылку на платёжную страницу.
export async function startPayment(order, st){
  const mode = (st.payment && st.payment.mode) || "manual";
  if(mode === "manual") return null;
  const r = await fetch(DB + "/functions/v1/create-payment", {
    method: "POST", headers: {"Content-Type": "application/json", apikey: CFG.supabaseKey},
    body: JSON.stringify({id: order.id, token: order.token, return_url: new URL(`order.html?id=${order.id}&t=${order.token}`, location.href).href})
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok || !j.url) throw new Error(j.message || "Не удалось открыть оплату");
  return j.url;
}

export const waLink = (wa, text) => `https://wa.me/${String(wa || "77078323500").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
