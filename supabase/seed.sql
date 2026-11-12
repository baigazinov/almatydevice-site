-- Начальные данные: товары и настройки, которые сейчас на сайте.
-- Запускать один раз после schema.sql. Повторный запуск не затрёт ваши правки.

insert into public.categories (id, name, sort) values
  ('audio','Наушники',1), ('keyboards','Клавиатуры',2), ('mice','Игровые мыши',3),
  ('pads','Коврики',4), ('switches','Свитчи',5), ('keycaps','Кейкапы',6)
on conflict (id) do nothing;

insert into public.products (id, name, brand, cat, price, pop, tag, color, spec) values
  ('mchose-h1','MCHOSE H1','MCHOSE','audio',21990,10,'Для PS5 и Xbox','#C8B6FF','Беспроводная гарнитура 2.4 ГГц, отстёгивающийся микрофон'),
  ('aula-s6','AULA S6','AULA','audio',14990,7,'Для PS5 и Xbox','#2FE6D0','Проводная гарнитура, разъём 3.5 мм, объёмный звук'),
  ('aula-f75','AULA F75','AULA','keyboards',32990,9,'Хит','#FF7AB8','75%, hot-swap, проводной / 2.4 ГГц / Bluetooth'),
  ('leobog-hi75','LEOBOG Hi75','LEOBOG','keyboards',29990,8,null,'#C7CCD6','75%, алюминиевый корпус, gasket-монтаж'),
  ('mchose-k99','MCHOSE K99','MCHOSE','keyboards',38990,5,'Новинка','#FFB86B','Полноразмерная, три режима, крутилка громкости'),
  ('wl-beastx','WLMOUSE Beast X','WLMOUSE','mice',54990,9,'Хит','#8E86A8','Магниевый корпус, 8K Гц, около 39 г'),
  ('pwnage-sb','Pwnage StormBreaker','PWNAGE','mice',59990,6,null,'#7FD1B9','Сменные боковины, беспроводная, 4K Гц'),
  ('mchose-a7','MCHOSE A7 Pro','MCHOSE','mice',24990,7,null,'#FFD45C','Симметричная, 55 г, PAW3395'),
  ('esptiger-ql','ESPTIGER Qinglong 3','ESPTIGER','pads',17990,8,null,'#4E9C92','Баланс скорости и контроля, 490×420 мм'),
  ('leobog-pad','LEOBOG Glass Pad','LEOBOG','pads',24990,4,'Предзаказ','#A7C4E8','Стеклянная поверхность, максимальное скольжение'),
  ('leobog-gw','LEOBOG Graywood V4 ×35','LEOBOG','switches',6990,7,null,'#9AA0A6','Линейные, 45 гс, заводская смазка'),
  ('aula-reaper','AULA Reaper ×35','AULA','switches',5990,5,null,'#FF3D9A','Линейные, 38 гс, мягкий глубокий звук'),
  ('caps-pbt','PBT кейкапы «Sunset»','AULA','keycaps',12990,6,null,'#B0247F','Cherry-профиль, 135 клавиш, кириллица')
on conflict (id) do nothing;

insert into public.site_settings (id, data) values (1, '{
  "wa": "77078323500",
  "free_from": 100000,
  "release": "2026-11-19T00:00:00+05:00",
  "promo": { "code": "NOV19", "percent": 10, "until": "2026-11-22T23:59:59+05:00", "untilText": "22 ноября" },
  "setup": [
    {"id":"mchose-h1","role":"Звук"}, {"id":"aula-f75","role":"Клавиатура"},
    {"id":"wl-beastx","role":"Мышь"}, {"id":"esptiger-ql","role":"Коврик"}
  ],
  "demo_note": true
}'::jsonb)
on conflict (id) do nothing;

-- способы доставки и оплаты по умолчанию
select public.ensure_settings_defaults();
