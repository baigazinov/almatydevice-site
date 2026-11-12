// Подключение к Supabase. Берётся в Supabase → Project Settings → API.
// Оба значения публичные: ключ anon / publishable можно хранить в коде сайта,
// доступ к заказам и клиентам закрыт правилами базы (RLS).
// Пока поля пустые, сайт работает на встроенных товарах и шлёт заказы только в WhatsApp.
window.AD_CONFIG = {
  supabaseUrl: "",       // например: https://abcdefgh.supabase.co
  supabaseKey: ""        // anon public key (eyJ...) или publishable key (sb_publishable_...)
};
