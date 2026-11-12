// Подключение к Supabase. Берётся в Supabase → Project Settings → API.
// Оба значения публичные: ключ anon / publishable можно хранить в коде сайта,
// доступ к заказам и клиентам закрыт правилами базы (RLS).
// Пока поля пустые, сайт работает на встроенных товарах и шлёт заказы только в WhatsApp.
window.AD_CONFIG = {
  supabaseUrl: "https://sdjrouzkuapqtotkkjit.supabase.co",
  supabaseKey: "sb_publishable_ap85wMJPFmUfLEKyGPRkcQ_iGebGN1o"
};
