Ниже — **готовый `ARCHITECTURE.md`** и **железобетонный промпт для chat.z.ai**. Я заложил безопасную Electron-архитектуру через `contextIsolation`/`contextBridge`, хранение настроек в `userData`, и сборку Windows-инсталлятора через NSIS/electron-builder — это соответствует официальной модели Electron и electron-builder. ([Electron][1])

---

# `ARCHITECTURE.md`

````md
# ARCHITECTURE.md — krofnePackUpdater

## 0. Назначение проекта

**krofnePackUpdater** — desktop-приложение для Windows 10/11, которое синхронизирует папку `mods` у игроков Minecraft с эталонной сборкой модов.

Цель: убрать ручную боль вида:

- "скачай эти 2 мода";
- "удали старую версию";
- "перекинь новый `.jar`";
- "почему у тебя не заходит на сервер";
- "у тебя другой набор модов".

Приложение должно работать по сценарию:

1. Пользователь запускает программу.
2. Программа пытается найти стандартную папку Minecraft.
3. Пользователь при необходимости вручную выбирает папку `mods`.
4. Программа скачивает `manifest.json` с GitHub.
5. Программа сравнивает локальные `.jar`-файлы с манифестом.
6. Программа показывает, что нужно скачать, заменить или отключить.
7. Пользователь нажимает "Синхронизировать".
8. Программа приводит папку `mods` к состоянию из манифеста.
9. Старые и лишние файлы не удаляются навсегда, а переносятся в backup/disabled.

Основной принцип:

> Никаких необратимых действий без backup.  
> Никаких удалений модов навсегда.  
> Никаких "магических" latest-версий.  
> Только конкретный список `.jar` из manifest.json и SHA-512-проверка.

---

## 1. Технический стек

### Обязательный стек

- Electron 41
- React 19
- Vite
- TypeScript 5.x
- Tailwind CSS 4.x
- shadcn/ui
- Node.js APIs в Electron main process:
  - `fs/promises`
  - `path`
  - `crypto`
  - `stream`
  - `os`
  - `https` или `fetch`
  - `child_process` использовать только если реально нужно

### Почему не Next.js

Next.js не нужен, потому что это не сайт и не SSR-приложение.

Нужно desktop-приложение, где:

- React отвечает за UI;
- Electron main process отвечает за файловую систему, скачивание и хеширование;
- Vite быстро собирает renderer;
- приложение пакуется в Windows installer.

---

## 2. Платформа и целевая среда

### Целевая ОС

- Windows 10
- Windows 11

### Minecraft

- Minecraft: `1.20.1`
- Loader: `Forge`
- Проверка точной версии Forge не обязательна в MVP.

### Синхронизируемые данные

В MVP синхронизируется только:

```text
.minecraft/mods
````

Не синхронизировать в MVP:

* `config`
* `resourcepacks`
* `shaderpacks`
* `options.txt`
* `servers.dat`
* запуск Minecraft из приложения

---

## 3. Главная идея архитектуры

Приложение состоит из двух слоёв:

```text
React Renderer UI
        ↓
preload.ts через contextBridge
        ↓
Electron Main Process
        ↓
services: fs / hashing / download / sync / backups / settings
```

Renderer не должен иметь прямой доступ к Node.js и файловой системе.

### Electron security requirements

В `BrowserWindow` обязательно:

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, "preload.js")
}
```

Renderer общается с main process только через строго описанный API в `preload.ts`.

---

## 4. Роли процессов

### 4.1. Main Process

Main process отвечает за:

* выбор папки через системный dialog;
* чтение и запись файлов;
* сканирование папки `mods`;
* подсчёт SHA-512;
* скачивание файлов;
* создание backup;
* перемещение лишних модов;
* rollback backup;
* сохранение настроек;
* чтение manifest;
* проверку доступности сервера;
* формирование sync plan.

### 4.2. Renderer Process

Renderer отвечает только за UI:

* экраны;
* кнопки;
* таблицы;
* прогресс;
* отображение ошибок;
* переключение режимов "Простой" / "Подробный";
* вызов методов из `window.krofnePack`.

Renderer не должен использовать:

* `fs`;
* `path`;
* `crypto`;
* прямые Node.js импорты.

### 4.3. Preload

`preload.ts` должен экспортировать безопасный API:

```ts
window.krofnePack = {
  getSettings,
  saveSettings,
  detectMinecraftFolders,
  selectModsFolder,
  loadManifest,
  checkMods,
  synchronize,
  listBackups,
  rollbackBackup,
  openFolder,
  checkServerStatus,
  getAppVersion,
  checkAppUpdate
}
```

---

## 5. Структура проекта

```text
krofne-pack-updater/
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  electron-builder.yml
  README.md
  ARCHITECTURE.md

  electron/
    main.ts
    preload.ts

    ipc/
      registerIpcHandlers.ts

    services/
      manifestService.ts
      minecraftPathService.ts
      scannerService.ts
      hashService.ts
      downloadService.ts
      syncPlannerService.ts
      syncExecutorService.ts
      backupService.ts
      settingsService.ts
      logService.ts
      updateCheckService.ts
      serverStatusService.ts
      adminManifestService.ts

    utils/
      safePath.ts
      fileSystem.ts
      retry.ts
      time.ts
      filename.ts

  shared/
    types/
      manifest.ts
      mod.ts
      sync.ts
      settings.ts
      backup.ts
      logs.ts
      ipc.ts

    constants.ts

  src/
    main.tsx
    App.tsx

    app/
      AppShell.tsx
      routes.tsx

    components/
      layout/
        TopBar.tsx
        Sidebar.tsx
        StatusFooter.tsx

      common/
        KButton.tsx
        KCard.tsx
        KBadge.tsx
        KProgress.tsx
        EmptyState.tsx
        ConfirmDialog.tsx

      dashboard/
        SimpleModePanel.tsx
        DetailedModePanel.tsx
        PackInfoCard.tsx
        FolderCard.tsx
        SummaryCards.tsx
        MainActionPanel.tsx
        ServerStatusCard.tsx

      mods/
        ModsTable.tsx
        ModStatusBadge.tsx
        ModDetailsDrawer.tsx

      logs/
        LogPanel.tsx

      backups/
        BackupsPage.tsx
        BackupCard.tsx
        RollbackDialog.tsx

      admin/
        AdminPage.tsx
        ManifestGeneratorPanel.tsx
        ManifestPreview.tsx
        ChangelogEditor.tsx

      settings/
        SettingsPage.tsx

    lib/
      api.ts
      format.ts
      status.ts
      cn.ts

    styles/
      globals.css

  resources/
    icon.ico
```

---

## 6. Manifest format

Источник правды — удалённый `manifest.json`, лежащий на GitHub.

### Рекомендуемое расположение

```text
GitHub repository:
krofne-minecraft-pack/

  manifest.json
  mods/
    mod-a.jar
    mod-b.jar
    mod-c.jar
  README.md
  CHANGELOG.md
```

### URL manifest

Пользователь может менять URL манифеста в настройках.

Дефолтный URL должен быть зашит в приложение как fallback.

Пример:

```text
https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/manifest.json
```

### Схема manifest.json

```json
{
  "schemaVersion": 1,
  "packName": "krofnePack",
  "packVersion": "1.0.0",
  "minecraftVersion": "1.20.1",
  "loader": "forge",
  "loaderVersion": null,
  "manifestUpdatedAt": "2026-04-28T00:00:00.000Z",
  "server": {
    "name": "krofne server",
    "address": "example.com",
    "port": 25565
  },
  "changelog": [
    {
      "version": "1.0.0",
      "date": "2026-04-28",
      "items": [
        "Initial modpack release"
      ]
    }
  ],
  "settings": {
    "extraFilesPolicy": "move_to_disabled",
    "maxParallelDownloads": 3,
    "downloadRetries": 3
  },
  "mods": [
    {
      "id": "example-mod",
      "name": "Example Mod",
      "fileName": "example-mod-1.20.1-forge.jar",
      "downloadUrl": "https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/mods/example-mod-1.20.1-forge.jar",
      "sha512": "PUT_SHA512_HERE",
      "sizeBytes": 1234567,
      "required": true,
      "side": "both",
      "allowUserToKeepDifferentVersion": false
    }
  ],
  "allowedExtraMods": [
    {
      "match": "filename_contains",
      "value": "xaero",
      "reason": "Client-side minimap allowed"
    },
    {
      "match": "filename_contains",
      "value": "journeymap",
      "reason": "Client-side minimap allowed"
    },
    {
      "match": "filename_contains",
      "value": "rubidium",
      "reason": "Client optimization mod"
    },
    {
      "match": "filename_contains",
      "value": "oculus",
      "reason": "Shader support"
    }
  ]
}
```

---

## 7. Data models

### 7.1. Manifest

```ts
export type LoaderType = "forge" | "fabric" | "neoforge" | "quilt";

export interface Manifest {
  schemaVersion: number;
  packName: string;
  packVersion: string;
  minecraftVersion: string;
  loader: LoaderType;
  loaderVersion: string | null;
  manifestUpdatedAt: string;
  server?: ServerInfo;
  changelog: ChangelogEntry[];
  settings: ManifestSettings;
  mods: ManifestMod[];
  allowedExtraMods?: AllowedExtraModRule[];
}

export interface ManifestSettings {
  extraFilesPolicy: "move_to_disabled";
  maxParallelDownloads: number;
  downloadRetries: number;
}

export interface ManifestMod {
  id: string;
  name: string;
  fileName: string;
  downloadUrl: string;
  sha512: string;
  sizeBytes?: number;
  required: boolean;
  side: "client" | "server" | "both";
  allowUserToKeepDifferentVersion?: boolean;
}

export interface ServerInfo {
  name: string;
  address: string;
  port: number;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export interface AllowedExtraModRule {
  match: "filename_contains" | "filename_regex" | "sha512";
  value: string;
  reason: string;
}
```

### 7.2. Local mod file

```ts
export interface LocalModFile {
  fileName: string;
  absolutePath: string;
  sizeBytes: number;
  modifiedAt: string;
  sha512: string;
}
```

### 7.3. Mod status

```ts
export type ModStatus =
  | "installed"
  | "missing"
  | "wrong_hash"
  | "extra"
  | "allowed_extra"
  | "download_pending"
  | "downloaded"
  | "updated"
  | "disabled"
  | "failed";

export interface ModCheckResult {
  status: ModStatus;
  manifestMod?: ManifestMod;
  localFile?: LocalModFile;
  expectedFileName?: string;
  message: string;
}
```

### 7.4. Sync plan

```ts
export interface SyncPlan {
  createdAt: string;
  modsDir: string;
  manifest: Manifest;

  installed: ModCheckResult[];
  missing: ModCheckResult[];
  wrongHash: ModCheckResult[];
  extra: ModCheckResult[];
  allowedExtra: ModCheckResult[];

  actions: SyncAction[];

  summary: {
    installedCount: number;
    missingCount: number;
    wrongHashCount: number;
    extraCount: number;
    allowedExtraCount: number;
    totalActions: number;
  };
}

export type SyncActionType =
  | "download"
  | "replace"
  | "move_extra_to_disabled"
  | "rename_to_manifest_filename";

export interface SyncAction {
  id: string;
  type: SyncActionType;
  mod?: ManifestMod;
  localFile?: LocalModFile;
  targetPath: string;
  backupPath?: string;
  reason: string;
}
```

---

## 8. Settings

Настройки хранятся в `app.getPath("userData")`.

Файл:

```text
%APPDATA%/krofnePackUpdater/settings.json
```

Пример:

```json
{
  "manifestUrl": "https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/manifest.json",
  "lastModsPath": "C:\\Users\\User\\AppData\\Roaming\\.minecraft\\mods",
  "uiMode": "simple",
  "debugMode": false,
  "maxParallelDownloads": 3,
  "downloadRetries": 3,
  "lastSuccessfulPackVersion": "1.0.0"
}
```

Тип:

```ts
export interface AppSettings {
  manifestUrl: string;
  lastModsPath: string | null;
  uiMode: "simple" | "detailed";
  debugMode: boolean;
  maxParallelDownloads: number;
  downloadRetries: number;
  lastSuccessfulPackVersion?: string;
}
```

---

## 9. Minecraft folder detection

### Цель

Программа должна помочь тупому пользователю и не заставлять его руками искать папку.

### Алгоритм

1. Проверить `settings.lastModsPath`.
2. Если путь существует и содержит папку `mods`, предложить его первым.
3. Проверить стандартный путь:

```text
%APPDATA%\.minecraft\mods
```

4. Проверить, существует ли:

```text
%APPDATA%\.minecraft
```

Если есть `.minecraft`, но нет `mods`, можно создать `mods` после подтверждения пользователя.

5. Вернуть список кандидатов:

```ts
export interface MinecraftFolderCandidate {
  label: string;
  modsPath: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  lastModifiedAt?: string;
}
```

6. Если кандидатов несколько, показывать пользователю выбор.
7. Всегда оставить кнопку "Выбрать папку mods вручную".

### UI-текст

```text
Мы нашли возможную папку mods:
C:\Users\...\AppData\Roaming\.minecraft\mods

[Использовать эту папку]
[Выбрать другую]
```

### Важно

Не пытаться агрессивно сканировать весь диск.

Не сканировать `C:\` рекурсивно.

---

## 10. Core sync algorithm

### 10.1. Check flow

При нажатии "Проверить":

1. Загрузить settings.
2. Проверить `modsPath`.
3. Скачать manifest.
4. Провалидировать manifest.
5. Просканировать локальные `.jar`.
6. Посчитать SHA-512 каждого `.jar`.
7. Сравнить с manifest.
8. Построить `SyncPlan`.
9. Показать summary.
10. Показать таблицу в подробном режиме.

### 10.2. Compare logic

Индексы:

```ts
localByHash: Map<string, LocalModFile>
localByFileName: Map<string, LocalModFile>
manifestByHash: Map<string, ManifestMod>
manifestByFileName: Map<string, ManifestMod>
```

Для каждого `ManifestMod`:

1. Если локально есть файл с таким SHA-512:

   * status = `installed`
   * если имя файла отличается от `manifest.fileName`, добавить action `rename_to_manifest_filename`.
2. Если локально есть файл с таким `fileName`, но SHA-512 другой:

   * status = `wrong_hash`
   * action = `replace`.
3. Если локально нет ни SHA-512, ни `fileName`:

   * status = `missing`
   * action = `download`.

Для каждого локального `.jar`:

1. Если его SHA-512 есть в manifest:

   * это уже учтённый installed.
2. Если его fileName есть в manifest, но hash другой:

   * это already wrong_hash.
3. Если файл подходит под `allowedExtraMods`:

   * status = `allowed_extra`
   * не трогать.
4. Иначе:

   * status = `extra`
   * action = `move_extra_to_disabled`.

### 10.3. allowedExtraMods

Это лёгкий способ whitelist без сложной системы.

Пример:

```json
"allowedExtraMods": [
  {
    "match": "filename_contains",
    "value": "xaero",
    "reason": "Client minimap allowed"
  }
]
```

Правила:

* Работает только на extra-моды.
* Не мешает обязательным модам из manifest.
* В UI показывать как "разрешённый лишний мод".
* В простом режиме не пугать пользователя такими модами.
* В подробном режиме показывать причину.

---

## 11. Sync execution algorithm

При нажатии "Синхронизировать":

1. Если нет актуального `SyncPlan`, сначала выполнить Check.
2. Показать confirmation dialog, если есть extra-моды:

```text
Будут отключены лишние моды: N.
Они НЕ будут удалены, а будут перенесены в:
mods/_disabled_by_krofne_pack

[Продолжить]
[Отмена]
```

3. Создать backup session:

```text
mods/_backup_by_krofne_pack/2026-04-28_21-30-00/
```

4. Выполнить actions в безопасном порядке:

```text
1. download missing во временные файлы
2. verify downloaded files
3. backup wrong_hash files
4. replace wrong_hash files
5. rename files if needed
6. move extra to disabled
7. write sync state
```

### Почему скачивание сначала

Нельзя сначала удалять/заменять старые файлы, а потом обнаружить, что интернет умер.

Правильно:

1. Скачать всё нужное.
2. Проверить хеши.
3. Только потом менять локальные файлы.

---

## 12. Download rules

### Обязательные правила

1. Скачивать не сразу в финальный `.jar`.
2. Скачивать во временный файл:

```text
filename.jar.download
```

3. После скачивания посчитать SHA-512.
4. Если SHA-512 совпадает:

   * переименовать в финальный `.jar`.
5. Если SHA-512 не совпадает:

   * удалить `.download`;
   * повторить попытку.
6. После 3 неудач:

   * остановить синхронизацию;
   * показать понятную ошибку;
   * оставить текущую папку в безопасном состоянии.

### Retry policy

```ts
maxRetries = 3
```

Повторять при:

* network error;
* timeout;
* incomplete download;
* hash mismatch.

Не повторять при:

* invalid URL;
* 404;
* нет прав на запись;
* manifest invalid.

### Параллельность

Можно использовать параллельное скачивание, но с лимитом:

```ts
maxParallelDownloads = 3
```

Если какая-то загрузка упала 3 раза — остановить весь sync.

---

## 13. Backup system

### Backup path

```text
mods/_backup_by_krofne_pack/YYYY-MM-DD_HH-mm-ss/
```

Пример:

```text
mods/
  _backup_by_krofne_pack/
    2026-04-28_21-30-00/
      sodium-old.jar
      create-old.jar
      backup-meta.json
```

### backup-meta.json

```json
{
  "createdAt": "2026-04-28T21:30:00.000Z",
  "packVersionBefore": "1.0.3",
  "packVersionAfter": "1.0.4",
  "modsDir": "C:\\Users\\User\\AppData\\Roaming\\.minecraft\\mods",
  "files": [
    {
      "originalPath": "C:\\Users\\User\\AppData\\Roaming\\.minecraft\\mods\\old.jar",
      "backupPath": "C:\\Users\\User\\AppData\\Roaming\\.minecraft\\mods\\_backup_by_krofne_pack\\2026-04-28_21-30-00\\old.jar",
      "reason": "wrong_hash_replace"
    }
  ]
}
```

### Что backup-ить

Backup делать для:

* файлов, которые заменяются;
* файлов, которые переименовываются;
* файлов, которые перемещаются в disabled — можно не копировать, потому что они уже сохраняются в disabled.

### Хранение

В MVP хранить все backups.

Не удалять старые backups автоматически.

---

## 14. Disabled extra mods

Лишние моды переносить в:

```text
mods/_disabled_by_krofne_pack/
```

Если файл с таким именем уже есть, добавлять timestamp:

```text
some-mod.jar
some-mod__2026-04-28_21-30-00.jar
```

Никогда не удалять extra-моды навсегда.

---

## 15. Rollback

### Вкладка "Бэкапы"

Показывать список backup sessions.

Для каждой backup session:

* дата;
* версия сборки до/после;
* количество файлов;
* кнопка "Посмотреть";
* кнопка "Откатить".

### Rollback logic

При откате:

1. Показать confirmation dialog.
2. Для каждого файла из `backup-meta.json`:

   * если текущий файл существует, переместить его в новый emergency backup;
   * восстановить файл из backupPath в originalPath.
3. Показать результат.
4. Записать log.

### Важное ограничение

Rollback восстанавливает только файлы, которые были заменены/переименованы.

Файлы из `_disabled_by_krofne_pack` пользователь может вернуть вручную или через отдельную кнопку "Восстановить отключённые".

---

## 16. Recovery after interrupted sync

Приложение должно быть устойчивым к обрыву.

### Sync state file

Во время sync писать файл:

```text
mods/.krofne-sync-state.json
```

Пример:

```json
{
  "syncId": "2026-04-28_21-30-00",
  "startedAt": "2026-04-28T21:30:00.000Z",
  "status": "running",
  "completedActions": [],
  "pendingActions": [],
  "tempFiles": [
    "mod-a.jar.download"
  ]
}
```

После успешной синхронизации:

```json
{
  "status": "completed"
}
```

При запуске приложения:

1. Проверить `.krofne-sync-state.json`.
2. Если `status = running`, показать:

```text
Похоже, прошлая синхронизация оборвалась.
[Восстановить порядок]
```

3. Recovery должен:

   * удалить `.download` файлы;
   * повторить Check;
   * предложить Sync заново.

---

## 17. UI modes

Нужно два режима:

1. Простой режим
2. Подробный режим

Также отдельный debug toggle.

---

## 18. Простой режим

Для технически слабых друзей.

### Главный экран

Название:

```text
krofnePackUpdater
```

Подзаголовок:

```text
Обновление модов для Minecraft 1.20.1 Forge
```

Блоки:

1. Статус папки
2. Статус сборки
3. Главная кнопка
4. Краткая информация
5. Сервер

### Состояния главного экрана

#### 18.1. Папка не выбрана

```text
Папка mods не выбрана

Мы попробуем найти стандартную папку Minecraft автоматически.
Если не получится — выбери папку mods вручную.

[Найти автоматически]
[Выбрать папку mods]
```

#### 18.2. Папка найдена

```text
Найдена папка mods:
C:\Users\...\AppData\Roaming\.minecraft\mods

[Использовать]
[Выбрать другую]
```

#### 18.3. Всё актуально

```text
✅ Моды актуальны

Сборка: krofnePack 1.0.4
Minecraft: 1.20.1 Forge

[Проверить снова]
```

#### 18.4. Нужно обновление

```text
⚠️ Нужно обновить моды

Будет скачано: 3
Будет заменено: 2
Будет отключено лишних: 1

[Синхронизировать]
[Подробности]
```

#### 18.5. Синхронизация идёт

```text
Обновляем моды...

Скачивается:
create-1.20.1.jar

Общий прогресс:
████████░░ 75%

Не закрывай приложение.
```

#### 18.6. Готово

```text
✅ Готово

Моды синхронизированы.
Теперь можно запускать Minecraft.
```

#### 18.7. Ошибка

```text
❌ Не удалось обновить моды

Причина:
Не удалось скачать файл после 3 попыток.

Что сделать:
1. Проверь интернет.
2. Нажми "Попробовать снова".
3. Если не помогло — отправь лог krofne.

[Попробовать снова]
[Открыть лог]
```

---

## 19. Подробный режим

Для владельца сборки и нормальных пользователей.

### Элементы

* Manifest URL input
* Mods path
* Pack info
* Summary cards
* Mods table
* Log panel
* Backup controls
* Server tools

### Summary cards

```text
✅ Установлено: 42
⬇️ Нужно скачать: 3
🔁 Нужно заменить: 2
📦 Лишние: 1
🟦 Разрешённые лишние: 2
```

### Mods table columns

| Column     | Description                                      |
| ---------- | ------------------------------------------------ |
| Status     | installed/missing/wrong_hash/extra/allowed_extra |
| Name       | mod name                                         |
| File       | fileName                                         |
| Local file | detected local file                              |
| Size       | size                                             |
| Action     | download/replace/disable/none                    |

В debug mode добавить:

| Column           | Description   |
| ---------------- | ------------- |
| SHA-512 expected | expected hash |
| SHA-512 local    | local hash    |
| URL              | downloadUrl   |

---

## 20. Debug mode

Debug mode включается в настройках.

Показывать:

* SHA-512;
* downloadUrl;
* raw manifest;
* detailed logs;
* IPC errors;
* stack traces;
* кнопка "Открыть папку логов";
* кнопка "Скопировать debug report".

В обычном режиме это не показывать.

---

## 21. Required buttons

### Top-level buttons

#### Simple mode

* `Найти папку автоматически`
* `Выбрать папку mods`
* `Проверить`
* `Синхронизировать`
* `Попробовать снова`
* `Подробности`

#### Detailed mode

* `Выбрать папку mods`
* `Открыть папку mods`
* `Проверить`
* `Синхронизировать`
* `Открыть disabled`
* `Открыть backups`
* `Скопировать лог`
* `Сохранить лог`
* `Проверить сервер`
* `Скопировать IP`

#### Backups page

* `Обновить список`
* `Открыть папку backup`
* `Откатить этот backup`
* `Посмотреть файлы`

#### Admin page

* `Выбрать локальную папку mods`
* `Загрузить старый manifest`
* `Сгенерировать manifest`
* `Сохранить manifest.draft.json`
* `Скопировать manifest`
* `Показать changelog`

#### Settings

* `Сохранить настройки`
* `Сбросить manifest URL`
* `Включить debug mode`
* `Переключить простой/подробный режим`

---

## 22. Navigation

Sidebar или top tabs:

```text
Главная
Моды
Бэкапы
Админ
Настройки
```

В простом режиме можно скрыть sidebar и оставить кнопку "Подробный режим".

---

## 23. Visual style

Стиль:

```text
WindowsUtilityOld + Minecraft-style
```

То есть:

* тёмная тема;
* чёткие панели;
* лёгкая пиксельная/Minecraft-атмосфера;
* без перегруза;
* крупная главная кнопка;
* понятные статусы;
* не слишком "киберпанк".

Цветовая логика:

* зелёный: всё хорошо;
* жёлтый: нужно действие;
* красный: ошибка;
* синий: скачивание/информация;
* серый: отключено/disabled.

---

## 24. Log system

### UI log

Логи показывать в debug mode или detailed mode.

### File logs

Сохранять логи в:

```text
app.getPath("userData")/logs/latest.log
app.getPath("userData")/logs/YYYY-MM-DD.log
```

### Log levels

```ts
type LogLevel = "info" | "warn" | "error" | "debug";
```

### Log entry

```ts
export interface SyncLogEntry {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
  details?: unknown;
}
```

### User-friendly errors

Ошибки должны быть понятными:

* "Не удалось скачать manifest."
* "Папка mods не найдена."
* "Нет прав на запись в папку mods."
* "Файл скачался, но SHA-512 не совпал."
* "Файл не найден на GitHub."
* "Нет интернета или GitHub недоступен."
* "Синхронизация остановлена после 3 неудачных попыток."

---

## 25. Admin mode

Admin mode нужен для владельца сборки.

### Цель

Упростить создание `manifest.json`.

### Функции

1. Выбрать локальную папку `mods`.
2. Просканировать `.jar`.
3. Посчитать SHA-512.
4. Подтянуть данные из старого manifest, если он выбран.
5. Создать `manifest.draft.json`.
6. Для новых модов:

   * `id` из имени файла;
   * `name` из имени файла;
   * `downloadUrl` автоматически сформировать по base GitHub raw URL, если указан;
   * `required = true`;
   * `side = both`;
   * `allowUserToKeepDifferentVersion = false`.
7. Дать preview JSON.
8. Дать кнопку сохранить файл.

### Admin inputs

* Pack name
* Pack version
* Minecraft version
* Loader
* GitHub raw base URL
* Old manifest path
* Local mods folder

### Admin output example

```json
{
  "schemaVersion": 1,
  "packName": "krofnePack",
  "packVersion": "1.0.5",
  "minecraftVersion": "1.20.1",
  "loader": "forge",
  "loaderVersion": null,
  "mods": []
}
```

---

## 26. Server status

Серверный блок не обязателен для sync, но полезен.

### Manifest server block

```json
"server": {
  "name": "krofne server",
  "address": "example.com",
  "port": 25565
}
```

### UI

```text
Сервер:
example.com:25565

[Проверить доступность]
[Скопировать IP]
```

### MVP implementation

Можно сделать простую TCP-проверку порта.

Если сложно — просто кнопка "Скопировать IP".

Не запускать Minecraft.

---

## 27. App update check

Автообновление не нужно.

Нужно только показывать, если доступна новая версия приложения.

### Механика

В настройках или отдельном файле на GitHub хранить:

```json
{
  "latestVersion": "1.0.3",
  "downloadUrl": "https://github.com/KROFN/krofnePackUpdater/releases/latest",
  "notes": [
    "Fixed sync bug",
    "Improved backup screen"
  ]
}
```

Приложение при запуске может проверить этот JSON и показать:

```text
Доступна новая версия krofnePackUpdater: 1.0.3
[Открыть страницу релиза]
```

Само приложение не обновлять автоматически.

---

## 28. Packaging

Нужен Windows installer.

### Package scripts

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "electron:dev": "electron .",
    "build": "tsc && vite build",
    "package:win": "electron-builder --win nsis"
  }
}
```

### Output

```text
dist/
  krofnePackUpdater Setup 1.0.0.exe
```

---

## 29. Safety rules

### Запрещено

* Удалять `.jar` навсегда.
* Заменять файлы без backup.
* Считать файл скачанным без SHA-512 проверки.
* Давать renderer прямой доступ к `fs`.
* Сканировать весь диск.
* Автоматически обновлять Minecraft/Forge.
* Запускать Minecraft из приложения.
* Скачивать latest-версии модов вместо конкретных файлов manifest.
* Синхронизировать `config` в MVP.

### Обязательно

* SHA-512 проверка.
* `.download` temp files.
* 3 retry.
* Backup before replace.
* Disabled folder for extra.
* Recovery after interrupted sync.
* User-friendly errors.
* Simple mode for обычных пользователей.
* Detailed/debug mode for владельца сборки.

---

## 30. MVP success criteria

MVP считается успешным, если:

1. Пользователь на Windows 10/11 запускает installer.
2. Приложение открывается.
3. Приложение находит или даёт выбрать папку `mods`.
4. Приложение скачивает manifest с GitHub.
5. Приложение сканирует 30–60 модов.
6. Приложение определяет:

   * установленные моды;
   * недостающие моды;
   * неправильные версии;
   * лишние моды.
7. Приложение скачивает недостающие моды.
8. Приложение заменяет неправильные версии с backup.
9. Приложение переносит лишние моды в `_disabled_by_krofne_pack`.
10. Приложение не ломает папку при ошибке скачивания.
11. После sync у пользователя в `mods` лежит правильный набор файлов.
12. Пользователь может зайти на сервер с Minecraft 1.20.1 Forge.

---

## 31. Recommended implementation order

### Phase 1 — Core

1. Project setup.
2. Electron main/preload/renderer.
3. Settings service.
4. Folder selection.
5. Manifest load.
6. Folder scan.
7. SHA-512 hashing.
8. Sync plan builder.

### Phase 2 — Sync

1. Download service.
2. Temp `.download`.
3. Hash verification.
4. Backup service.
5. Replace files.
6. Move extra to disabled.
7. Sync logs.
8. Error handling.

### Phase 3 — UI

1. Simple mode.
2. Detailed mode.
3. Mods table.
4. Progress UI.
5. Logs panel.
6. Settings page.

### Phase 4 — Recovery and backups

1. `.krofne-sync-state.json`.
2. Interrupted sync detection.
3. Backups list.
4. Rollback.
5. Disabled folder controls.

### Phase 5 — Admin

1. Manifest generator.
2. Old manifest import.
3. GitHub raw base URL.
4. Changelog editor.
5. Save manifest draft.

### Phase 6 — Polish

1. App update check.
2. Server status/copy IP.
3. Installer.
4. README.
5. Final bug pass.

---

## 32. Final UX target

Для обычного друга приложение должно ощущаться так:

```text
Открыл → нажал "Синхронизировать" → готово.
```

Для владельца сборки приложение должно ощущаться так:

```text
Вижу все моды → вижу хеши/логи → могу сгенерировать manifest → могу откатить backup.
```

Это не Minecraft launcher.

Это безопасный personal modpack updater.

````