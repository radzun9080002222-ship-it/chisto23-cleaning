# Подключение `/calc` к Google Calendar

Калькулятор не хранит ключ Google во фронтенде. Кнопка отправляет смету в
Supabase Edge Function, а функция создаёт событие через Google Calendar API от
имени отдельного service account.

## 1. Google Cloud

1. В существующем или отдельном Google Cloud project включить **Google Calendar API**.
2. Создать service account без ролей проекта и скачать его JSON-ключ.
3. В Google Calendar открыть настройки нужного календаря и выдать адресу service
   account право **«Вносить изменения в мероприятия»**.

JSON-ключ не добавлять в Git. После переноса значений в Supabase исходный файл
лучше удалить с рабочего компьютера.

## 2. Supabase

Рабочий проект: `apuajxotemukpjheppaz` (`vershina-platform-dev`). Миграция
применена, функция `manager-calc` опубликована без проверки JWT на шлюзе; запрос
защищён собственными проверками PIN и origin внутри функции.

Применить миграцию и опубликовать функцию:

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
npx supabase functions deploy manager-calc --no-verify-jwt
```

Затем установить секреты функции:

```bash
npx supabase secrets set CALC_PIN=3715
npx supabase secrets set GOOGLE_CALENDAR_ID=CALENDAR_ID
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=SERVICE_ACCOUNT_EMAIL
npx supabase secrets set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
npx supabase secrets set GOOGLE_CALENDAR_COLOR_ID=7
```

`CALENDAR_ID` берётся в настройках календаря. Для основного личного календаря
это обычно адрес аккаунта-владельца. Значение хранится только в секретах Supabase.

## 3. GitHub Pages

В **Settings → Secrets and variables → Actions → Variables** репозитория добавить:

```text
VITE_MANAGER_CALC_URL=https://PROJECT_REF.supabase.co/functions/v1/manager-calc
VITE_CALC_PIN=3715
```

После следующего deployment страница `https://chisto23.ru/calc` загрузит цены из
таблицы `manager_calc_pricing` и начнёт добавлять события сразу по кнопке.

Текущий endpoint:

```text
https://apuajxotemukpjheppaz.supabase.co/functions/v1/manager-calc
```

## Формат события

- заголовок: тип уборки, площадь и отметка о химчистке;
- начало и длительность — из формы;
- часовой пояс — по выбранному городу;
- адрес — в поле location;
- полная смета и данные клиента — в description;
- напоминание — за 30 минут;
- цвет — голубой (`colorId=7`), его можно заменить секретом.

## Граница PIN-защиты

GitHub Pages — статический хостинг, поэтому PIN скрывает интерфейс, но сам по себе
не является полноценной серверной авторизацией страницы. Операция записи в
календарь дополнительно защищена проверкой PIN в Edge Function и ограничением
допустимых origin. Если понадобится строгая приватность содержимого калькулятора,
страницу нужно перенести за серверную сессию (например, в диспетчерскую).
