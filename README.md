# Almaty Device — сайт и CRM

Промо-страница магазина игровой периферии к релизу GTA VI и админка для заказов, клиентов и каталога.

| Что | Где |
|---|---|
| Сайт | `index.html` → https://baigazinov.github.io/almatydevice-site/ |
| Админка | `admin/index.html` → https://baigazinov.github.io/almatydevice-site/admin/ |
| Подключение к базе | `config.js` |
| База данных | `supabase/schema.sql`, `supabase/seed.sql` |

## Как это работает

- Товары, категории, промокод, подборка «Сетап к релизу», дата отсчёта, порог бесплатной доставки и номер WhatsApp хранятся в базе Supabase и редактируются в админке.
- Заказ с сайта сохраняется в базе с номером (№1001, №1002…), и у клиента открывается WhatsApp с тем же номером заказа. Цены и скидку база пересчитывает сама, поэтому подменить сумму в браузере нельзя.
- Клиенты собираются автоматически по номеру телефона, видна вся история их заказов.
- Если база недоступна или `config.js` пустой, сайт показывает встроенные в `index.html` товары и отправляет заказы только в WhatsApp, как раньше.

## Подключение (один раз, ~15 минут)

1. **Создайте проект** на [supabase.com](https://supabase.com) (бесплатный тариф). Регион ближе всего: Frankfurt (eu-central-1).
2. **Создайте таблицы.** SQL Editor → New query → вставьте весь `supabase/schema.sql` → Run. Потом так же `supabase/seed.sql`, чтобы перенести текущие товары и настройки.
3. **Подключите сайт.** Project Settings → API (или API Keys): скопируйте **Project URL** и **anon public** (или **publishable**) ключ в `config.js`. Ключ `service_role` / `secret` в сайт **не вставлять**.
4. **Создайте себе вход.** Authentication → Users → Add user → email и пароль (галочка Auto Confirm). Затем в SQL Editor:
   ```sql
   insert into public.staff (user_id, email, role)
   select id, email, 'admin' from auth.users where email = 'ВАШ_EMAIL';
   ```
5. Залейте изменения (`git push`), через минуту откройте `/admin/` и войдите.

Остальных сотрудников добавляйте так: создать пользователя в Authentication → Users, потом в админке «Сотрудники» → ввести его email.

## Уведомления о заказах в Telegram (по желанию)

1. В Telegram напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите токен бота.
2. Напишите своему боту любое сообщение (или добавьте его в рабочую группу), затем откройте `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найдите `"chat":{"id": ...}`.
3. В Supabase → SQL Editor:
   ```sql
   insert into private.secrets (key, value) values
     ('telegram_token',   'ТОКЕН_БОТА'),
     ('telegram_chat_id', 'ID_ЧАТА')
   on conflict (key) do update set value = excluded.value;
   ```
Токен хранится в закрытой схеме базы и не виден ни с сайта, ни из админки.

## Роли

- **Менеджер**: заказы, клиенты, товары, категории, настройки сайта.
- **Админ**: всё то же, плюс сотрудники и удаление заказов.
