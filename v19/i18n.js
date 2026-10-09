// Walkie-Talkie — English interface.
// The app is written in Russian. When English is chosen, every Russian text on screen
// (text, placeholder, title, aria-label) is swapped for its English version right as it appears.
// Things people write (names, messages) are marked translate="no" and are never touched.
(function () {
  'use strict';
  const EN = {
    // ---------- join screen ----------
    'Голосовые звонки с друзьями ·': 'Voice calls with friends ·',
    'Голосовые звонки с друзьями': 'Voice calls with friends',
    'Код канала, друзья, микрофон — и вы на связи.': 'A channel code, your friends, a mic — and you’re on air.',
    'Твоё имя': 'Your name',
    'Например, Паша': 'For example, Alex',
    'Код канала': 'Channel code',
    'Новый код': 'New code',
    'Подключиться': 'Join',
    'Подключаемся…': 'Connecting…',
    'Нажми «Новый код» или придумай свой.': 'Press “New code” or make up your own.',
    'Скажи код друзьям.': 'Tell the code to your friends.',
    'Друзья открывают эту же страницу и вводят тот же код.': 'Friends open Walkie-Talkie and enter the same code.',
    'Имя берётся из профиля': 'The name comes from your profile',
    'Напиши своё имя.': 'Type your name.',
    'Код канала — минимум 3 латинские буквы или цифры.': 'The channel code needs at least 3 Latin letters or digits.',
    'Браузер не даёт доступ к микрофону. Открой страницу в Chrome, Edge или Firefox.': 'This browser gives no microphone access. Open the page in Chrome, Edge or Firefox.',
    'Не загрузилась библиотека для звонков. Проверь интернет и перезапусти Walkie-Talkie (или нажми Ctrl+R).': 'The call library did not load. Check your internet and restart Walkie-Talkie (or press Ctrl+R).',
    'Не загрузилась библиотека для звонков. Проверь интернет и обнови страницу (Ctrl+F5).': 'The call library did not load. Check your internet and reload the page (Ctrl+F5).',
    'Нет доступа к микрофону. Открой Параметры Windows → Конфиденциальность → Микрофон и разреши доступ приложениям.': 'No microphone access. Open Windows Settings → Privacy → Microphone and allow apps to use it.',
    'Нет доступа к микрофону. Разреши его в браузере (значок слева от адреса) и нажми ещё раз.': 'No microphone access. Allow it in the browser (icon left of the address) and try again.',
    'Микрофон не найден. Подключи его и попробуй снова.': 'No microphone found. Plug one in and try again.',
    'Не получилось включить микрофон.': 'Could not turn on the microphone.',
    'Твой аккаунт заблокирован администратором Walkie-Talkie.': 'Your account has been blocked by a Walkie-Talkie administrator.',
    'Тема': 'Theme', 'Язык': 'Language', 'Русский': 'Русский',
    // ---------- call ----------
    'Звонок': 'Call', 'Канал': 'Channel', 'Связь': 'Connection', 'В канале': 'In the channel',
    'Стримы и камеры': 'Streams and cameras', 'Люди в канале': 'People in the channel',
    'Копировать ссылку': 'Copy link', 'Копировать код': 'Copy code', 'Скопировано': 'Copied', 'Нажми Ctrl+C': 'Press Ctrl+C',
    'Подключаемся к серверам…': 'Connecting to servers…',
    'Не получается достучаться ни до одного сервера-посредника. Похоже, их блокирует провайдер — включи VPN и зайди заново.': 'Cannot reach any relay server. Your provider may be blocking them — turn on a VPN and join again.',
    'Кто-то зашёл с этим кодом, но с другой версией страницы. Пусть скачает файл заново.': 'Someone joined with this code but uses a different version. Ask them to update.',
    'Друг нашёлся, но соединиться напрямую не получилось: ваши сети не пускают звонок. Попробуйте оба включить VPN или раздать интернет с телефона и зайти заново.': 'Your friend was found, but a direct connection failed: your networks block the call. Both try a VPN or a phone hotspot and join again.',
    'Друг нашёлся, но соединиться не получилось ни напрямую, ни через сервер. Попробуйте оба включить VPN или раздать интернет с телефона и зайти заново.': 'Your friend was found, but the call failed both directly and through the server. Both try a VPN or a phone hotspot and join again.',
    'неизвестная ошибка': 'unknown error',
    'Пока никто ничего не показывает': 'Nobody is showing anything yet',
    'Включи камеру или покажи экран кнопками внизу.': 'Turn on your camera or share your screen with the buttons below.',
    'Когда друг начнёт стрим, здесь появится кнопка «Смотреть».': 'When a friend starts streaming, a “Watch” button appears here.',
    'Камера': 'Camera', 'Экран': 'Screen', 'В эфире': 'Live', 'Настройки': 'Settings', 'Выйти': 'Leave', 'Чаты': 'Chats',
    'Выйти из канала': 'Leave the channel', 'Выключить камеру': 'Turn camera off', 'Включить камеру': 'Turn camera on',
    'Остановить стрим': 'Stop stream', 'Показать экран': 'Share screen',
    'Владелец комнаты запретил тебе стримить': 'The room owner has banned you from streaming',
    'Нет доступа к камере. Разреши её в браузере (значок слева от адреса).': 'No camera access. Allow it in the browser (icon left of the address).',
    'Камера не найдена.': 'No camera found.', 'Камера занята другой программой.': 'The camera is busy in another program.',
    'Не получилось включить камеру.': 'Could not turn on the camera.',
    'Этот браузер не умеет показывать экран. Попробуй Chrome или Edge на компьютере.': 'This browser cannot share the screen. Try Chrome or Edge on a computer.',
    'Не получилось показать экран.': 'Could not share the screen.',
    'Не получилось подключиться к стриму. Попробуй ещё раз.': 'Could not connect to the stream. Try again.',
    'Микрофон выключен': 'Microphone off', 'Микрофон включён': 'Microphone on', 'Говоришь…': 'Talking…', 'Говоришь': 'Talking',
    'Держи, чтобы говорить': 'Hold to talk', 'Закончить проверку': 'Finish the test',
    'Голос запрещён администратором': 'Voice banned by an administrator', 'Голос отключён владельцем': 'Muted by the room owner',
    'Тебя слышно': 'You can be heard', 'Подключается…': 'Connecting…', 'Проверяет микрофон': 'Testing the microphone',
    'Режим рации': 'Push to talk', 'Говорит': 'Talking', 'Проверка микрофона — друзья тебя не слышат': 'Microphone test — friends can’t hear you',
    'ты': 'you', 'владелец': 'owner', 'Ты': 'You', 'Друг': 'Friend', 'Без имени': 'No name',
    'Управление': 'Manage', 'Громкость голоса': 'Voice volume', 'Пинг голосовой связи': 'Voice connection ping',
    'Ты смотришь этот стрим': 'You are watching this stream', 'Смотреть стрим': 'Watch stream', 'Смотреть': 'Watch',
    'камера': 'camera', 'без стримов': 'no streaming', 'стрим без звука': 'stream without sound', 'Твой стрим': 'Your stream',
    'Громкость стрима': 'Stream volume', 'Выйти из стрима': 'Leave the stream', 'Качество': 'Quality', 'На весь экран': 'Full screen',
    'Включить звук стрима': 'Unmute the stream', 'Выключить звук стрима': 'Mute the stream',
    'пока никто не смотрит': 'nobody is watching yet',
    'Администратор Walkie-Talkie запретил тебе говорить.': 'A Walkie-Talkie administrator has banned you from talking.',
    'Владелец комнаты отключил тебе голос.': 'The room owner has muted you.',
    'Администратор Walkie-Talkie запретил тебе стримить.': 'A Walkie-Talkie administrator has banned you from streaming.',
    'Владелец комнаты запретил тебе стримить.': 'The room owner has banned you from streaming.',
    'Ты говоришь, но микрофон выключен': 'You are talking, but your microphone is off',
    'Включить микрофон': 'Turn microphone on', 'Больше не показывать': 'Don’t show again', 'Позже': 'Later', 'Перезапустить': 'Restart',
    'Работает даже в игре.': 'Works even in games.',
    'Клавиши работают, только когда окно Walkie-Talkie активно.': 'Keys work only while the Walkie-Talkie window is active.',
    'Клавишу, которая включает и выключает микрофон даже в игре, можно задать в настройках.': 'You can set a key that toggles the microphone even in games in the settings.',
    '— держи, чтобы говорить.': '— hold to talk.', '— включить или выключить микрофон.': '— turn the microphone on or off.',
    '— держи, чтобы говорить. Работает даже в игре.': '— hold to talk. Works even in games.',
    '— держи, чтобы говорить. Клавиши работают, только когда окно Walkie-Talkie активно.': '— hold to talk. Keys work only while the Walkie-Talkie window is active.',
    '— включить или выключить микрофон. Работает даже в игре.': '— turn the microphone on or off. Works even in games.',
    '— включить или выключить микрофон. Клавиши работают, только когда окно Walkie-Talkie активно.': '— turn the microphone on or off. Keys work only while the Walkie-Talkie window is active.',
    'Пробел': 'Space', 'Левый Shift': 'Left Shift', 'Правый Shift': 'Right Shift', 'Левый Ctrl': 'Left Ctrl', 'Правый Ctrl': 'Right Ctrl',
    'Левый Alt': 'Left Alt', 'Правый Alt': 'Right Alt', 'Колёсико мыши': 'Mouse wheel', 'Мышь 4': 'Mouse 4', 'Мышь 5': 'Mouse 5',
    'Меню': 'Menu', 'не задана': 'not set', 'Ё': '`', 'Х': '[', 'Ъ': ']', 'Ж': ';', 'Э': "'", 'Б': ',', 'Ю': '.',
    'График пинга за последнюю минуту': 'Ping chart for the last minute',
    'Когда в канале появятся друзья, здесь будет пинг до каждого.': 'When friends join, their ping will show up here.',
    'напрямую': 'direct', 'через сервер': 'via server',
    // ---------- settings ----------
    'Закрыть настройки': 'Close settings', 'Закрыть': 'Close', 'Статус': 'Status', 'В сети': 'Online', 'Не беспокоить': 'Do not disturb',
    'Без звуков входа и выхода друзей. Друзья видят красный значок': 'No join and leave sounds. Friends see a red badge',
    'Сейчас «неактивен»: тебя не было за компьютером больше 10 минут': 'Now “idle”: you have been away for more than 10 minutes',
    'Через 10 минут без действий станет «неактивен»': 'After 10 minutes without activity it becomes “idle”',
    'Микрофон': 'Microphone', 'Устройство': 'Device', 'Звук: наушники или колонки': 'Sound: headphones or speakers',
    'Не получилось включить этот микрофон.': 'Could not turn on this microphone.',
    'Микрофон сменится, когда перезайдёшь в канал.': 'The microphone will change when you rejoin the channel.',
    'Режим микрофона': 'Microphone mode', 'Голосом': 'Voice', 'Рация': 'Push to talk',
    'Тебя слышно, только пока держишь клавишу или кнопку': 'You are heard only while you hold the key or button',
    'Тебя слышно всегда, пока микрофон включён': 'You are heard whenever the microphone is on',
    'Клавиша рации': 'Push-to-talk key', 'Клавиша микрофона': 'Microphone key', 'Нажми клавишу…': 'Press a key…',
    'Держи её, пока говоришь — работает даже в игре. Можно поставить боковую кнопку мыши. Чтобы сменить, нажми на кнопку с клавишей': 'Hold it while you talk — works even in games. A side mouse button works too. To change it, click the key button',
    'Держи её, пока говоришь. Чтобы сменить, нажми на кнопку с клавишей': 'Hold it while you talk. To change it, click the key button',
    'Включает и выключает микрофон, даже когда ты в игре. Можно поставить боковую кнопку мыши. Backspace — убрать клавишу': 'Turns the microphone on and off even in games. A side mouse button works too. Backspace removes the key',
    'Предупреждать, если говорю с выключенным микрофоном': 'Warn me when I talk with the microphone off',
    'Звук и надпись внизу экрана': 'A sound and a note at the bottom of the screen',
    'Шумодав': 'Noise suppression', 'Выключен': 'Off', 'Загружается…': 'Loading…', 'Включён: фоновый шум вырезается': 'On: background noise is removed',
    'Не загрузился — проверь интернет и перезапусти Walkie-Talkie. Пока работает только слабый встроенный фильтр': 'Did not load — check your internet and restart Walkie-Talkie. Only the weak built-in filter works for now',
    'Не загрузился в этом браузере — работает только слабый встроенный фильтр': 'Did not load in this browser — only the weak built-in filter works',
    'Выключен в музыкальном режиме': 'Off in music mode',
    'Выкл': 'Off', 'Обычный': 'Normal', 'Сильный': 'Strong',
    'Не включился в этом браузере — работает только слабый встроенный фильтр': 'Did not start in this browser — only the weak built-in filter works',
    'Выключен: работает только слабый встроенный фильтр': 'Off: only the weak built-in filter works',
    'Вырезает фон, а пока ты молчишь, микрофон полностью тихий: клавиатура, мышь и стук не слышны': 'Removes background noise, and while you’re silent the mic is fully quiet: no keyboard, mouse or knocks',
    'Вырезает фон, но щелчки и стук могут проскакивать. Подходит, если «Сильный» глотает тихие слова': 'Removes background noise, but clicks and knocks may slip through. Use it if “Strong” swallows quiet words',
    'Звук из колонок попадает обратно в микрофон, проверка остановлена. Проверяй микрофон в наушниках.': 'Sound from the speakers is getting back into the mic, so the test was stopped. Test the mic with headphones.',
    'Музыкальный режим': 'Music mode',
    'Включён: чистый звук микрофона в стерео, без шумодава, эхоподавления и автогромкости. Лучше в наушниках': 'On: the clean microphone sound in stereo, no noise suppression, echo cancelling or auto volume. Better with headphones',
    'Для музыки и инструментов: выключает всю обработку голоса': 'For music and instruments: turns off all voice processing',
    'Не получилось переключить микрофон.': 'Could not switch the microphone.',
    'Приглушать других, когда я говорю': 'Lower others while I talk',
    'Друзья и стримы становятся тише, пока ты говоришь': 'Friends and streams get quieter while you talk',
    'Громкость остальных, пока ты говоришь:': 'Others’ volume while you talk:',
    'Проверка микрофона': 'Microphone test', 'Недоступно в этом браузере': 'Not available in this browser',
    'Идёт проверка: ты слышишь себя, друзья тебя не слышат, их звук выключен': 'Testing: you hear yourself, friends can’t hear you, their sound is off',
    'Услышишь себя так, как тебя слышат друзья. Лучше в наушниках': 'Hear yourself the way friends hear you. Better with headphones',
    'Обновления': 'Updates', 'Проверить': 'Check', 'Проверяю…': 'Checking…', 'Ещё раз': 'Try again',
    'У тебя последняя версия': 'You have the latest version', 'Проверяются сами раз в несколько часов': 'Checked automatically every few hours',
    'нет связи': 'no connection',
    'Комната': 'Room', 'Качество голоса': 'Voice quality', 'Обычное': 'Standard', 'Экономное · 24 кбит/с': 'Economy · 24 kbps',
    'Хорошее · 48 кбит/с': 'Good · 48 kbps', 'Высокое · 96 кбит/с': 'High · 96 kbps', 'Максимум · 128 кбит/с': 'Maximum · 128 kbps',
    'Студия · 510 кбит/с': 'Studio · 510 kbps', 'Очень высокое · 128 кбит/с': 'Very high · 128 kbps', 'Авто · 6–8 Мбит/с': 'Auto · 6–8 Mbps',
    'Битрейт стримов': 'Stream bitrate', 'Авто': 'Auto', '1,5 Мбит/с': '1.5 Mbps', '3 Мбит/с': '3 Mbps', '6 Мбит/с': '6 Mbps', '10 Мбит/с': '10 Mbps',
    'Заблокированы в комнате': 'Banned in this room', 'Разблокировать': 'Unblock',
    'Ты владелец комнаты (зашёл раньше всех). Меняешь качество для всех, а кнопкой ⋯ рядом с человеком можешь отключить ему голос, запретить стримить, выгнать или заблокировать.': 'You own this room (you joined first). You set the quality for everyone, and with the ⋯ button next to a person you can mute, ban from streaming, kick or ban them.',
    '— управление': '— manage',
    'У друга старая версия Walkie-Talkie — управлять им нельзя.': 'This friend has an old Walkie-Talkie version — they can’t be managed.',
    'Отключить голос': 'Mute', 'Запретить стримить': 'Ban from streaming', 'Стримы без звука': 'Streams without sound',
    'Выгнать из канала': 'Kick from the channel', 'Заблокировать в канале': 'Ban from the channel',
    'Качество твоего стрима (для всех)': 'Your stream quality (for everyone)', 'Разрешение': 'Resolution', 'Как на экране': 'As on screen',
    'Ты демонстрируешь экран': 'You are sharing your screen', 'Пока никто не смотрит': 'Nobody is watching yet',
    'Экран — приоритет плавности': 'Screen — smoothness first', 'Окно — приоритет чёткости текста': 'Window — sharp text first',
    'превью выключено, чтобы не нагружать видеокарту': 'preview is off to spare the graphics card',
    'Кадров/с': 'FPS', 'Качество для тебя (если тормозит — понизь)': 'Quality for you (lower it if it lags)', 'Как у стримера': 'Same as the streamer',
    // ---------- screen picker ----------
    'Что показать друзьям': 'What to show your friends', 'Что показать': 'What to show', 'Экран целиком': 'Entire screen', 'Окно': 'Window',
    'Кадров в секунду': 'Frames per second', 'Звук компьютера': 'Computer sound',
    'Друзья услышат игру. Голоса из звонка тоже попадут в стрим — если у зрителей эхо, выключи звук': 'Friends will hear the game. Voices from the call also get into the stream — if viewers hear an echo, turn the sound off',
    'Отмена': 'Cancel', 'Начать стрим': 'Start stream',
    'Не получилось получить список экранов и окон.': 'Could not get the list of screens and windows.',
    'Открытых окон не нашлось. Если игра в полноэкранном режиме, выбери «Экран целиком».': 'No open windows found. If the game is full screen, pick “Entire screen”.',
    'Экраны не нашлись.': 'No screens found.', 'Весь экран': 'Entire screen',
    // ---------- updates ----------
    'Перезапуск займёт пару секунд. Или обновится сама при следующем запуске.': 'Restarting takes a couple of seconds. Or it updates by itself on the next start.',
    'Перезапуск прервёт звонок — можно и потом: при следующем запуске Walkie-Talkie обновится сама.': 'Restarting ends the call — you can do it later: Walkie-Talkie updates itself on the next start.',
    'Для неё нужно один раз заново запустить установщик (install.bat).': 'It needs the installer (install.bat) to be run once more.',
    // ---------- accounts ----------
    'Аккаунт': 'Account', 'Войти через Google': 'Sign in with Google', 'Загружаю аккаунт…': 'Loading account…',
    'Открыл браузер — войди там через Google и возвращайся сюда.': 'Your browser is open — sign in with Google there and come back.',
    'Войди через Google, чтобы завести профиль, добавлять друзей и переписываться. Звонить можно и без аккаунта.': 'Sign in with Google to create a profile, add friends and chat. Calls work without an account too.',
    'Не загрузилась часть программы для аккаунтов — проверь интернет и перезапусти Walkie-Talkie. Звонки работают и без аккаунта.': 'The accounts part did not load — check your internet and restart Walkie-Talkie. Calls work without an account.',
    'Осталось заполнить профиль.': 'Just fill in your profile.', 'Загружаю профиль…': 'Loading profile…', 'Заполнить профиль': 'Fill in profile',
    'Профиль': 'Profile', 'Друзья': 'Friends', 'Сообщения': 'Messages', 'Админка': 'Admin', 'Друзья и сообщения': 'Friends and messages',
    'Твой аккаунт заблокирован администратором': 'Your account has been blocked by an administrator',
    'Аккаунт заблокирован': 'Account blocked', 'Администратор Walkie-Talkie заблокировал твой аккаунт': 'A Walkie-Talkie administrator has blocked your account',
    'нет прав на это действие': 'not allowed', 'нет связи с сервером': 'no connection to the server', 'вход отменён': 'sign-in cancelled',
    'Время на вход вышло. Попробуй ещё раз.': 'Sign-in timed out. Try again.',
    'Не получилось скопировать': 'Could not copy', 'Напиши имя': 'Type a name', 'Тег — от 3 до 20 латинских букв, цифр или _': 'A tag is 3–20 Latin letters, digits or _',
    'Тег занят или правила базы не обновлены': 'The tag is taken or the database rules are not updated',
    'Заявка отправлена': 'Request sent', 'Заблокирован': 'Blocked', 'заблокирован': 'blocked', 'Приглашение отправлено': 'Invitation sent',
    'Сначала войди в аккаунт': 'Sign in first', 'Это сообщение из чужой переписки': 'This message is from someone else’s chat',
    'Ссылка на сообщение': 'Link to a message', 'Ты администратор': 'You are an administrator',
    'Неверный пароль (или отпечаток ещё не вставлен в правила базы)': 'Wrong password (or the fingerprint is not in the database rules yet)',
    'Сохранено': 'Saved', 'Скрыть пароль': 'Hide password', 'Показать пароль': 'Show password',
    'Сегодня': 'Today', 'Вчера': 'Yesterday', 'вчера': 'yesterday',
    'в сети': 'online', 'неактивен': 'idle', 'не беспокоить': 'do not disturb', 'не в сети': 'offline',
    'Это сообщение не нашлось — возможно, оно очень старое': 'That message was not found — it may be very old',
    'Загрузка…': 'Loading…', 'Ещё': 'More', 'Позвать в мой канал': 'Invite to my channel', 'Скопировать тег': 'Copy tag', 'Тег скопирован': 'Tag copied',
    'Удалить из друзей': 'Remove friend', 'Заблокировать': 'Block',
    'Найти по тегу, например @vasya': 'Find by tag, e.g. @alex', 'Ищу…': 'Searching…', 'Добавить в друзья': 'Add friend', 'Написать': 'Message',
    'Принять заявку': 'Accept request', 'Добавить друга': 'Add a friend', 'Заявки в друзья': 'Friend requests', 'Принять': 'Accept', 'Отклонить': 'Decline',
    'Пока никого. Найди друга по тегу — тег виден у него в профиле.': 'Nobody yet. Find a friend by tag — it’s shown in their profile.',
    'Ты отправил заявки': 'Requests you sent', 'Отменить': 'Cancel', 'Заблокированы': 'Blocked', 'не может писать тебе и добавлять в друзья': 'can’t message you or add you as a friend',
    'Нет сообщений': 'No messages', 'Переписок пока нет. Открой друга во вкладке «Друзья» и нажми «Написать».': 'No chats yet. Open a friend on the “Friends” tab and press “Message”.',
    'Выбери переписку': 'Pick a chat', 'Слева — твои диалоги с друзьями.': 'Your chats with friends are on the left.',
    'К списку': 'Back to the list', 'Позвать в канал': 'Invite to the channel', 'Показать раньше': 'Show earlier', 'Напиши первое сообщение.': 'Write the first message.',
    'Ты заблокировал этого человека.': 'You blocked this person.', 'Этот человек ограничил общение с тобой.': 'This person has restricted contact with you.',
    'Вы больше не друзья — писать нельзя.': 'You are not friends anymore — you can’t write.', 'Администратор запретил тебе писать сообщения.': 'An administrator has banned you from sending messages.',
    'Редактирование сообщения': 'Editing a message', 'Отправить': 'Send', 'отправляется…': 'sending…', 'Сообщение удалено': 'Message deleted',
    'кого-то': 'someone', '(изменено)': '(edited)', 'прочитано': 'read', 'Реакция': 'React', 'Изменить': 'Edit', 'Переслать': 'Forward',
    'Переслать кому:': 'Forward to:', 'Нет друзей, кому переслать': 'No friends to forward to', 'Скопировать текст': 'Copy text', 'Текст скопирован': 'Text copied',
    'Скопировать ссылку': 'Copy link', 'Ссылка скопирована — её можно вставить в любой чат Walkie-Talkie': 'Link copied — paste it into any Walkie-Talkie chat',
    'Удалить': 'Delete', 'Удалить сообщение': 'Delete message', 'Сменить аватар': 'Change avatar', 'Сменить': 'Change', 'Не получилось открыть картинку': 'Could not open the picture',
    'По тегу тебя находят друзья. Латинские буквы, цифры и _ (3–20).': 'Friends find you by your tag. Latin letters, digits and _ (3–20).',
    'Латинские буквы, цифры и _ (3–20).': 'Latin letters, digits and _ (3–20).',
    'Сохранить': 'Save', 'Профиль сохранён': 'Profile saved', 'Убрать': 'Remove', 'Имя': 'Name', 'Тег': 'Tag',
    'Администрирование': 'Administration', 'Ты администратор Walkie-Talkie. Инструменты — во вкладке «Админка».': 'You are a Walkie-Talkie administrator. The tools are on the “Admin” tab.',
    'Отказаться от прав': 'Give up the rights', 'Права выданы по твоей почте в правилах базы.': 'The rights come from your e-mail in the database rules.',
    'Пароль администратора': 'Administrator password',
    'Права администратора выдаются по паролю. Проверяет его сервер, в программе пароль не хранится.': 'Administrator rights are granted by password. The server checks it; the app doesn’t store it.',
    'Получить права': 'Get rights', 'Новый пароль': 'New password', 'Ещё раз': 'Again', 'Скопировать': 'Copy', 'Отпечаток скопирован': 'Fingerprint copied',
    'Создать пароль администратора': 'Create an administrator password',
    'Это нужно сделать один раз владельцу проекта. Придумай пароль — Walkie-Talkie покажет его отпечаток. Вставь отпечаток в правила базы вместо PASSWORD_HASH и нажми Publish. По отпечатку пароль узнать нельзя.': 'The project owner does this once. Make up a password — Walkie-Talkie shows its fingerprint. Put the fingerprint into the database rules instead of PASSWORD_HASH and press Publish. The password can’t be recovered from the fingerprint.',
    'Показать отпечаток': 'Show fingerprint', 'Пароль — минимум 10 символов': 'The password needs at least 10 characters', 'Пароли не совпадают': 'The passwords don’t match',
    'Изменения сразу видят друзья и люди в звонке.': 'Friends and people in your call see changes right away.',
    'Оформление': 'Appearance',
    'Через 10 минут без действий станешь «неактивен», а когда Walkie-Talkie закрыта — «не в сети».': 'After 10 minutes without activity you become “idle”, and when Walkie-Talkie is closed — “offline”.',
    'Скопировать мой тег': 'Copy my tag', 'Выйти из аккаунта': 'Sign out', 'Мой профиль': 'My profile', 'Модерация': 'Moderation',
    'Заблокирован администратором': 'Blocked by an administrator', 'Тег пользователя': 'User tag', 'Найти пользователя': 'Find a user', 'Открыть': 'Open',
    'Под ограничениями': 'Restricted', 'Никого.': 'Nobody.', 'без голоса': 'no voice', 'стримы без звука': 'streams without sound', 'без сообщений': 'no messages',
    'Причина (её увидит пользователь)': 'Reason (the user will see it)',
    'Заблокировать в Walkie-Talkie (ни звонков, ни сообщений)': 'Block in Walkie-Talkie (no calls, no messages)',
    'Запретить говорить в звонках': 'Ban from talking in calls', 'Запретить стримы': 'Ban from streaming', 'Стримы только без звука': 'Streams only without sound',
    'Запретить личные сообщения': 'Ban from private messages',
    'Привет! Заполни профиль': 'Hi! Fill in your profile',
    'Имя и аватар видят друзья и люди в звонке. Тег — твой уникальный ник, по нему тебя ищут.': 'Friends and people in calls see your name and avatar. The tag is your unique nickname — people find you by it.',
    'Готово': 'Done', 'Профиль создан': 'Profile created', 'Войди в аккаунт на главном экране Walkie-Talkie': 'Sign in on the Walkie-Talkie main screen',
    // ---------- chat in the channel ----------
    'Чат': 'Chat', 'Чат канала': 'Channel chat', 'Закрыть чат': 'Close chat', 'Личные': 'DMs', 'Личные сообщения': 'Direct messages',
    'Сообщение': 'Message', 'Новые сообщения ↓': 'New messages ↓', 'Кого упомянуть': 'Mention someone',
    'Прикрепить картинку': 'Attach a picture', 'Прикрепить картинку (или вставь её через Ctrl+V)': 'Attach a picture (or paste it with Ctrl+V)',
    'Написать в канал…': 'Message the channel…', 'Отправить (Enter)': 'Send (Enter)', 'Картинка из чата': 'Picture from the chat',
    'Администратор Walkie-Talkie запретил тебе писать сообщения.': 'A Walkie-Talkie administrator has banned you from writing messages.',
    'Владелец комнаты запретил тебе писать в чат.': 'The room owner has banned you from the chat.',
    'Картинка': 'Picture', 'Картинка недоступна': 'Picture not available', 'Открыть картинку': 'Open the picture',
    'Ответить': 'Reply', 'Удалить сообщение у всех': 'Delete the message for everyone', 'Показать сообщение': 'Show the message',
    'Здесь пока тихо': 'It’s quiet here',
    'Напиши первым — сообщение увидят все, кто в канале. Картинку можно вставить через Ctrl+V.': 'Write first — everyone in the channel will see it. Paste a picture with Ctrl+V.',
    'Этого сообщения уже нет в истории': 'That message is no longer in the history',
    'Редактирование сообщения · Esc — отмена': 'Editing the message · Esc to cancel', 'Ответ для': 'Replying to',
    'Не так быстро — подожди пару секунд.': 'Not so fast — wait a couple of seconds.',
    'Картинка слишком большая.': 'The picture is too big.', 'Это не картинка, или её не получилось открыть.': 'That’s not a picture, or it couldn’t be opened.',
    'Чат этого канала': 'This channel’s chat', 'Очистить историю на этом компьютере': 'Clear the history on this computer',
    'История очищена у тебя. У друзей она осталась.': 'History cleared on your computer. Your friends still have it.',
    'Запретить писать в чат': 'Ban from the chat', 'без чата': 'no chat',
    // ---------- calls to a friend ----------
    'Позвонить': 'Call', 'Ты уже звонишь': 'You are already calling', 'Входящий звонок': 'Incoming call',
    'Звонит тебе': 'Calling you', 'Зовёт тебя в свой канал': 'Invites you to their channel', 'Звоню…': 'Calling…',
    'Звоню… Не беспокоить — может не ответить': 'Calling… Do not disturb — may not answer', 'Звоню… Не в сети — может не ответить': 'Calling… Offline — may not answer',
    'Звонок без ответа': 'Unanswered call', 'Пропущенный звонок': 'Missed call',
    'Позвонить ещё раз': 'Call again', 'Перезвонить': 'Call back', 'Звонок уже закончился': 'The call has already ended',
    'Не получилось позвонить. Если только что звонил — подожди 15 секунд.': 'Could not call. If you have just called, wait 15 seconds.',
    'У друга старая версия Walkie-Talkie — отправляю приглашение в личку': 'Your friend has an old Walkie-Talkie — sending an invitation in DMs instead',
    // ---------- join a friend ----------
    'В голосовом канале': 'In a voice channel', 'Вы в одном канале': 'You’re in the same channel', 'Зайти': 'Join',
    'Голосовой канал': 'Voice channel', 'Друзья могут заходить ко мне без приглашения': 'Friends can join me without an invitation',
    'Друзья видят, в каком ты канале, и заходят одной кнопкой. Выключишь — увидят только, что ты в канале и сколько там людей.': 'Friends see which channel you’re in and join with one button. Turn it off and they only see that you’re in a channel and how many people are there.'
  };
  const map = new Map(Object.entries(EN));
  const CYR = /[А-Яа-яЁё]/;
  const sub = (s) => (s == null ? null : (map.has(s) ? map.get(s) : core(s)));
  const subOr = (s) => { const v = sub(s); return v == null ? s : v; };
  const plural = (n, one, many) => n + ' ' + (Number(n) === 1 ? one : many);
  // Texts built from parts (names, numbers) are matched by patterns.
  const PAT = [
    [/^(\d+) (зритель|зрителя|зрителей)$/, (m) => plural(m[1], 'viewer', 'viewers')],
    [/^(\d+) чел\.$/, (m) => plural(m[1], 'person', 'people')],
    [/^(\d+) КБ$/, (m) => m[1] + ' KB'],
    [/^Не видят чат — старая версия: (.+)$/, (m) => 'Can’t see the chat (old version): ' + m[1]],
    [/^(\d+) мс$/, (m) => m[1] + ' ms'],
    [/^потери ([\d.]+)%$/, (m) => 'loss ' + m[1] + '%'],
    [/^джиттер (\d+) мс$/, (m) => 'jitter ' + m[1] + ' ms'],
    [/^исходящие потери ([\d.]+)%$/, (m) => 'outgoing loss ' + m[1] + '%'],
    [/^видео −(\d+)%$/, (m) => 'video −' + m[1] + '%'],
    [/^Ждём друзей — скажи им код · серверов-посредников: (\d+) из (\d+)$/, (m) => 'Waiting for friends — tell them the code · relays: ' + m[1] + ' of ' + m[2]],
    [/^На связи · серверов-посредников: (\d+) из (\d+)$/, (m) => 'Connected · relays: ' + m[1] + ' of ' + m[2]],
    [/^версия (\d+)$/, (m) => 'version ' + m[1]],
    [/^Скачана версия (\d+)\. Включится после перезапуска$/, (m) => 'Version ' + m[1] + ' downloaded. It turns on after a restart'],
    [/^Скачиваю версию (\d+)…$/, (m) => 'Downloading version ' + m[1] + '…'],
    [/^Вышла версия (\d+), но для неё нужно один раз заново запустить установщик$/, (m) => 'Version ' + m[1] + ' is out, but it needs the installer run once more'],
    [/^Готово обновление — версия (\d+)$/, (m) => 'Update ready — version ' + m[1]],
    [/^Вышла версия (\d+)$/, (m) => 'Version ' + m[1] + ' is out'],
    [/^(.*?)(Перезапуск (?:прервёт|займёт).*|Для неё нужно один раз.*)$/, (m) => m[1] + subOr(m[2])],
    [/^Ты говоришь, но не держишь (.+) — тебя не слышно$/, (m) => 'You are talking but not holding ' + subOr(m[1]) + ' — nobody hears you'],
    [/^Режим рации — держи (.+)$/, (m) => 'Push to talk — hold ' + subOr(m[1])],
    [/^Клавиша (\d+)$/, (m) => 'Key ' + m[1]],
    [/^Num −$/, () => 'Num −'],
    [/^(.+) показывает экран$/, (m) => m[1] + ' is sharing the screen'],
    [/^Смотрят: (.+)$/, (m) => 'Watching: ' + subOr(m[1])],
    [/^(.+) выгнан из канала\.$/, (m) => m[1] + ' was kicked from the channel.'],
    [/^(.+) заблокирован в канале\.$/, (m) => m[1] + ' is banned from the channel.'],
    [/^Владелец комнаты выгнал тебя из канала (.+)\.$/, (m) => 'The room owner kicked you from channel ' + m[1] + '.'],
    [/^Владелец комнаты заблокировал тебя в канале (.+)\.$/, (m) => 'The room owner banned you from channel ' + m[1] + '.'],
    [/^Владелец комнаты — (.+) \(зашёл раньше всех\)\. Качество меняет он\.$/, (m) => 'The room owner is ' + m[1] + ' (joined first). They set the quality.'],
    [/^Твой голос сейчас уходит примерно на (\d+) кбит\/с\.$/, (m) => 'Your voice is going out at about ' + m[1] + ' kbps.'],
    [/^(@[a-z0-9_]+) — нажми, чтобы открыть профиль$/, (m) => m[1] + ' — click to open the profile'],
    [/^(.+) — управление$/, (m) => m[1] + ' — manage'],
    [/^Тег @([a-z0-9_]+) уже занят$/, (m) => 'Tag @' + m[1] + ' is already taken'],
    [/^@([a-z0-9_]+) уже занят$/, (m) => '@' + m[1] + ' is taken'],
    [/^@([a-z0-9_]+) свободен$/, (m) => '@' + m[1] + ' is free'],
    [/^Никого с тегом @(.*)…$/, (m) => 'Nobody with tag @' + m[1] + '…'],
    [/^в сети (\d+)$/, (m) => m[1] + ' online'],
    [/^Ты:\s*$/, () => 'You: '],
    [/^Сообщение для (.+)…$/, (m) => 'Message ' + m[1] + '…'],
    [/^Переслано от (.+)$/, (m) => 'Forwarded from ' + m[1]],
    [/^Переслано: (.+)$/, (m) => 'Forwarded to ' + m[1]],
    [/^Зайти в канал (.+)$/, (m) => 'Join channel ' + m[1]],
    [/^Нет ответа: (.+)$/, (m) => 'No answer: ' + m[1]],
    [/^Звонок принят: (.+)$/, (m) => 'Call answered: ' + m[1]],
    [/^Пропущенный звонок: (.+)$/, (m) => 'Missed call: ' + m[1]],
    [/^(.+) сейчас не может ответить$/, (m) => m[1] + ' can’t answer right now'],
    [/^(.+) тоже звонит тебе$/, (m) => m[1] + ' is calling you too'],
    [/^(.+) сейчас зайдёт к тебе в канал$/, (m) => m[1] + ' is coming to your channel'],
    [/^Вход через Google: (.*)$/, (m) => 'Signed in with Google: ' + m[1]],
    [/^Не получилось зайти в канал: (.*)$/, (m) => 'Could not join the channel: ' + subOr(m[1])],
    [/^(Не получилось войти|Не получилось проверить|Не загрузился профиль|Связь с сервером|Не получилось|Поиск|Сообщения|Не отправилось|Не переслалось|Не сохранилось): (.*)$/,
      (m) => ({ 'Не получилось войти': 'Could not sign in', 'Не получилось проверить': 'Could not check', 'Не загрузился профиль': 'Profile did not load', 'Связь с сервером': 'Server connection',
        'Не получилось': 'Failed', 'Поиск': 'Search', 'Сообщения': 'Messages', 'Не отправилось': 'Not sent', 'Не переслалось': 'Not forwarded', 'Не сохранилось': 'Not saved' })[m[1]] + ': ' + subOr(m[2])]
  ];
  function core(k) {
    for (const [re, fn] of PAT) { const m = re.exec(k); if (m) return fn(m); }
    // "a · b · c" and "a, b — c": translate every part, or nothing
    for (const sep of [' · ', ' — ', ', ']) {
      if (!k.includes(sep)) continue;
      const parts = k.split(sep);
      const out = parts.map((p) => (CYR.test(p) ? sub(p.trim()) : p));
      if (out.every((x) => x != null)) return out.join(sep);
    }
    return null;
  }
  function tr(s) {
    const k = s.trim();
    if (!k || !CYR.test(k)) return null;
    const v = sub(k);
    return v == null ? null : s.replace(k, v);
  }

  let lang = 'ru';
  const texts = new WeakMap(); // text node -> { ru, shown }
  const attrs = new WeakMap(); // element -> { attr: { ru, shown } }
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const skip = (el) => !el || !!el.closest('[translate="no"], script, style, textarea, code');
  function doText(node) {
    if (skip(node.parentElement)) return;
    const cur = node.nodeValue;
    const rec = texts.get(node);
    if (rec && cur === rec.shown && rec.lang === lang) return;
    const ru = rec && cur === rec.shown ? rec.ru : cur;
    const shown = lang === 'en' ? (tr(ru) ?? ru) : ru;
    texts.set(node, { ru, shown, lang });
    if (cur !== shown) node.nodeValue = shown;
  }
  function doAttr(el, name) {
    if (skip(el)) return;
    const cur = el.getAttribute(name);
    if (cur == null) return;
    let recs = attrs.get(el);
    if (!recs) attrs.set(el, (recs = {}));
    const rec = recs[name];
    if (rec && cur === rec.shown && rec.lang === lang) return;
    const ru = rec && cur === rec.shown ? rec.ru : cur;
    const shown = lang === 'en' ? (tr(ru) ?? ru) : ru;
    recs[name] = { ru, shown, lang };
    if (cur !== shown) el.setAttribute(name, shown);
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    for (const a of ATTRS) if (root.hasAttribute(a)) doAttr(root, a);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else for (const a of ATTRS) if (n.hasAttribute(a)) doAttr(n, a);
    }
  }
  const mo = new MutationObserver((list) => {
    if (lang !== 'en' && !document.documentElement.dataset.wtWasEn) return;
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
      else m.addedNodes.forEach(walk);
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  window.WT_I18N = {
    apply(l) {
      lang = l === 'en' ? 'en' : 'ru';
      if (lang === 'en') document.documentElement.dataset.wtWasEn = '1';
      if (document.body) walk(document.body);
    },
    t: (s) => (lang === 'en' ? (tr(s) ?? s) : s),
    lang: () => lang
  };
})();
