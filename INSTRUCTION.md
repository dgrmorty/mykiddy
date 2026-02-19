
# 🚀 Kiddy OS: Руководство разработчика

Добро пожаловать в команду разработки **Kiddy OS**! Это гибридное приложение: мы пишем код один раз на веб-технологиях, а затем запускаем его и в браузере, и на телефоне.

---

## 📋 Системные требования

1.  **Node.js** (v18+).
2.  **Android Studio** + **Java (JDK) 21**. 
    *Примечание: Мы используем JDK 21 как наиболее стабильную LTS-версию.*

---

## 📱 Полный цикл сборки APK

### Шаг 1: Подготовка (В КОРНЕ ПРОЕКТА)
```bash
npm run build
npx cap sync
```

### Шаг 2: Сборка (В ПАПКЕ ANDROID)
```bash
cd android
./gradlew assembleDebug
```

### 🎯 ГДЕ ЛЕЖИТ ГОТОВЫЙ APK?
Путь от корня проекта:
**`android/app/build/outputs/apk/debug/app-debug.apk`**

Команда для быстрого открытия папки в Finder (macOS):
`open android/app/build/outputs/apk/debug/`

---

## 🛠 Решение ошибки "Unsupported class file major version 68"

Эта ошибка означает, что система пытается использовать Java 24 вместо 21.

1. Узнайте путь к вашей Java 21:
   `echo $(/usr/libexec/java_home -v 21)`
2. Откройте файл `android/gradle.properties`.
3. Добавьте в конец файла строку:
   `org.gradle.java.home=ПУТЬ_ИЗ_ШАГА_1`
   *(Например: org.gradle.java.home=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home)*
4. Выполните: `./gradlew clean` и повторите сборку.

---

## ✅ Как принудительно сменить Java на 21 (macOS)

### 1. Разовая смена (в текущем окне):
```bash
export JAVA_HOME=`/usr/libexec/java_home -v 21`
java -version
```

### 2. Постоянная смена (навсегда):
Введите эти команды по очереди:
```bash
echo 'export JAVA_HOME=`/usr/libexec/java_home -v 21`' >> ~/.zshrc
source ~/.zshrc
```

---

## 🛠 Настройка в Android Studio

Даже если в терминале всё ок, Студии нужно указать путь отдельно:
1. Откройте **Android Studio**.
2. Перейдите в `Settings` -> `Build, Execution, Deployment` -> `Build Tools` -> `Gradle`.
3. В поле **Gradle JDK** выберите **JDK 21**.

---

Удачи в коде! 💻✨
