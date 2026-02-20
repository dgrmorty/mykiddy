# Инструкция по созданию APK файла

## Предварительные требования

1. **Android Studio** (последняя версия)
   - Скачать: https://developer.android.com/studio
   - Установить Android SDK (через Android Studio)

2. **Java JDK 17 или выше**
   - Проверить: `java -version`
   - Если нет, установить через Android Studio

3. **Node.js 18+** (уже установлен)

## Шаг 1: Подготовка проекта

```bash
# Убедитесь, что все зависимости установлены
npm install

# Соберите проект
npm run build
```

## Шаг 2: Инициализация Android проекта (если еще не сделано)

```bash
# Если папки android/ еще нет, выполните:
npm run android:init

# Это создаст папку android/ с нативным Android проектом
```

## Шаг 3: Синхронизация с Capacitor

```bash
# Синхронизируйте веб-сборку с Android проектом
npx cap sync android
```

## Шаг 4: Открытие в Android Studio

```bash
# Откройте Android проект в Android Studio
npx cap open android
```

Или вручную:
- Откройте Android Studio
- File → Open → выберите папку `android/` в корне проекта

## Шаг 5: Настройка в Android Studio

1. **Дождитесь синхронизации Gradle** (может занять несколько минут при первом запуске)

2. **Проверьте настройки приложения:**
   - Откройте `android/app/src/main/AndroidManifest.xml`
   - Проверьте `package` и `applicationId`

3. **Настройте подпись (для релизной сборки):**
   - File → Project Structure → Modules → app → Signing Configs
   - Создайте новый signing config или используйте debug по умолчанию

## Шаг 6: Сборка APK

### Вариант A: Debug APK (для тестирования)

1. В Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Дождитесь завершения сборки
3. APK будет в: `android/app/build/outputs/apk/debug/app-debug.apk`

### Вариант B: Release APK (для публикации)

1. **Build → Generate Signed Bundle / APK**
2. Выберите **APK**
3. Создайте новый keystore (или используйте существующий):
   - **Key store path**: выберите место для сохранения
   - **Key alias**: придумайте имя (например, `kiddy-key`)
   - **Password**: придумайте надежный пароль
   - **Validity**: 25 лет (рекомендуется)
   - **Certificate**: заполните данные
4. Выберите **release** build variant
5. Нажмите **Finish**
6. APK будет в: `android/app/build/outputs/apk/release/app-release.apk`

## Шаг 7: Установка на устройство

### Через USB (Debug режим):

1. Включите **Режим разработчика** на Android устройстве:
   - Настройки → О телефоне → 7 раз нажмите на "Номер сборки"
2. Включите **Отладка по USB**:
   - Настройки → Для разработчиков → Отладка по USB
3. Подключите устройство к компьютеру
4. В Android Studio: **Run → Run 'app'**
5. Выберите ваше устройство

### Через файл APK:

1. Скопируйте APK файл на устройство
2. Откройте файл на устройстве
3. Разрешите установку из неизвестных источников (если нужно)
4. Установите приложение

## Важные замечания

### Настройка API endpoints

Убедитесь, что в `config.ts` правильно настроены URL для API:
- Для разработки: `http://localhost:3000`
- Для продакшена: ваш реальный сервер

### Permissions

Проверьте `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Обновление приложения

После изменений в коде:
```bash
# 1. Пересоберите веб-версию
npm run build

# 2. Синхронизируйте с Android
npx cap sync android

# 3. Откройте в Android Studio и пересоберите APK
npx cap open android
```

## Troubleshooting

### Ошибка: "SDK location not found"
- Откройте Android Studio
- File → Settings → Appearance & Behavior → System Settings → Android SDK
- Скопируйте путь к SDK
- Создайте файл `android/local.properties`:
```
sdk.dir=C:/Users/YourName/AppData/Local/Android/Sdk
```

### Ошибка: "Gradle sync failed"
- File → Invalidate Caches → Invalidate and Restart
- Или: File → Sync Project with Gradle Files

### Приложение не подключается к серверу
- Проверьте, что сервер доступен с устройства
- Для локального сервера используйте IP адрес компьютера, а не `localhost`
- Проверьте файрвол и настройки сети

## Полезные команды

```bash
# Очистка сборки
cd android
./gradlew clean
cd ..

# Просмотр логов
npx cap run android --livereload

# Проверка версии Capacitor
npx cap --version
```
