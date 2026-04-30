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
- Node.js APIs в Electron main process: `fs/promises`, `path`, `crypto`, `stream`, `os`, `https`/`fetch`

### Почему не Next.js
Next.js не нужен — это не сайт и не SSR-приложение. Нужно desktop-приложение, где React отвечает за UI, Electron main process — за файловую систему и скачивание, Vite — за сборку renderer, electron-builder — за Windows installer.

---

## 2. Платформа и целевая среда

- Windows 10/11
- Minecraft 1.20.1, Forge
- В MVP синхронизируется только `.minecraft/mods`
- Не синхронизировать: config, resourcepacks, shaderpacks, options.txt, servers.dat
- Не запускать Minecraft из приложения

---

## 3. Архитектура процессов

```text
React Renderer UI
        ↓
preload.ts через contextBridge
        ↓
Electron Main Process
        ↓
services: fs / hashing / download / sync / backups / settings
```

### Electron security
```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, "preload.js")
}
```

Renderer общается с main process только через `window.krofnePack`.

---

## 4. Структура проекта

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
    ipc/registerIpcHandlers.ts
    services/ (12 services)
    utils/ (5 utils)

  shared/
    types/ (7 type files)
    constants.ts

  src/
    main.tsx
    App.tsx
    app/ (AppShell, routes)
    components/ (layout, common, dashboard, mods, logs, backups, admin, settings)
    lib/ (api, format, status, cn)
    styles/globals.css

  resources/icon.ico
```

---

## 5. Manifest format

Источник правды — удалённый `manifest.json` на GitHub.

```json
{
  "schemaVersion": 1,
  "packName": "krofnePack",
  "packVersion": "1.0.0",
  "minecraftVersion": "1.20.1",
  "loader": "forge",
  "loaderVersion": null,
  "manifestUpdatedAt": "2026-04-28T00:00:00.000Z",
  "server": { "name": "krofne server", "address": "example.com", "port": 25565 },
  "changelog": [{ "version": "1.0.0", "date": "2026-04-28", "items": ["Initial release"] }],
  "settings": { "extraFilesPolicy": "move_to_disabled", "maxParallelDownloads": 3, "downloadRetries": 3 },
  "mods": [{
    "id": "example-mod",
    "name": "Example Mod",
    "fileName": "example-mod-1.20.1-forge.jar",
    "downloadUrl": "https://raw.githubusercontent.com/KROFN/krofne-minecraft-pack/main/mods/example-mod-1.20.1-forge.jar",
    "sha512": "PUT_SHA512_HERE",
    "sizeBytes": 1234567,
    "required": true,
    "side": "both",
    "allowUserToKeepDifferentVersion": false
  }],
  "allowedExtraMods": [{ "match": "filename_contains", "value": "xaero", "reason": "Client minimap allowed" }]
}
```

---

## 6. Data models

См. `shared/types/` для полных TypeScript-определений:
- `Manifest`, `ManifestMod`, `ManifestSettings`, `ServerInfo`, `ChangelogEntry`, `AllowedExtraModRule`
- `LocalModFile`, `ModStatus`, `ModCheckResult`
- `SyncPlan`, `SyncAction`, `SyncActionType`
- `AppSettings`
- `BackupSession`, `BackupFileRecord`
- `SyncLogEntry`, `LogLevel`
- `KrofnePackAPI` (IPC API interface)

---

## 7. Check algorithm

1. Загрузить settings → проверить modsPath.
2. Скачать manifest с GitHub → провалидировать schema.
3. Просканировать локальные `.jar` → посчитать SHA-512.
4. Построить индексы: `localByHash`, `localByFileName`, `manifestByHash`, `manifestByFileName`.
5. Сравнить:
   - SHA совпадает → `installed` (если имя отличается → `rename_to_manifest_filename`)
   - fileName совпадает, SHA другой → `wrong_hash`, action `replace`
   - файла нет → `missing`, action `download`
   - локальный не в manifest → проверить `allowedExtraMods` → `allowed_extra` или `extra`
   - `extra` → action `move_extra_to_disabled`
6. Построить `SyncPlan` → показать summary + таблицу.

---

## 8. Sync execution algorithm

1. Если нет SyncPlan → сначала Check.
2. Confirmation dialog для extra-модов.
3. Создать backup session: `mods/_backup_by_krofne_pack/YYYY-MM-DD_HH-mm-ss/`
4. Скачать missing/wrong_hash target files во временные `.download`.
5. После каждой загрузки проверить SHA-512.
6. Только если SHA-512 совпал — считать валидным.
7. Для wrong_hash → backup старого → заменить.
8. Скачать missing.
9. Переименовать при необходимости.
10. Перенести extra → `mods/_disabled_by_krofne_pack/`.
11. Ничего не удалять навсегда.
12. Записать итоговый log + сохранить `lastSuccessfulPackVersion`.

---

## 9. Download rules

- Скачивать во временный `filename.jar.download`.
- После скачивания проверить SHA-512.
- Несовпадение → удалить `.download` → retry.
- 3 retry max. После 3 неудач — остановить sync.
- `maxParallelDownloads = 3`.
- Не оставлять битые `.jar` в mods.

---

## 10. Backup system

- Path: `mods/_backup_by_krofne_pack/YYYY-MM-DD_HH-mm-ss/`
- `backup-meta.json` с описанием файлов.
- Не удалять backups автоматически.
- Rollback: восстановить файлы из backup, текущие → emergency backup.

---

## 11. Disabled extra mods

- Лишние моды → `mods/_disabled_by_krofne_pack/`
- Если имя занято → добавить timestamp.
- Никогда не удалять.

---

## 12. Recovery

- Sync state: `mods/.krofne-sync-state.json`
- При запуске: если `status = running` → показать предупреждение.
- Recovery: удалить `.download` файлы → предложить Check/Sync.

---

## 13. UI modes

### Простой режим
Для обычных пользователей. Большие кнопки, минимум информации.

Состояния: папка не выбрана → найдена → всё актуально → нужно обновление → sync → готово → ошибка.

### Подробный режим
Для владельца сборки. Manifest URL, Mods path, Pack info, Summary cards, Mods table, Log panel, Backup controls, Server tools.

### Debug mode
Показывать SHA-512, downloadUrl, raw manifest, stack traces.

---

## 14. Admin mode

Генерация `manifest.json` из локальной папки mods:
1. Выбрать папку → сканировать `.jar` → посчитать SHA-512.
2. Загрузить старый manifest (опционально).
3. Сформировать `manifest.draft.json`.
4. Preview → Сохранить → Скопировать.

---

## 15. Logs

- Файлы: `userData/logs/latest.log`, `userData/logs/YYYY-MM-DD.log`
- UI: LogPanel в detailed/debug mode.
- Кнопки: "Скопировать лог", "Открыть папку логов".

---

## 16. Server status

- Показывать address:port из manifest.
- Кнопки: "Скопировать IP", "Проверить доступность" (TCP check).
- Не запускать Minecraft.

---

## 17. App update check

- Проверка JSON на GitHub: `{ latestVersion, downloadUrl, notes }`.
- Показать "Доступна новая версия" + кнопка "Открыть страницу релиза".
- Автообновление не делать.

---

## 18. Packaging

- electron-builder + NSIS для Windows.
- Output: `dist/krofnePackUpdater Setup 1.0.0.exe`.

---

## 19. Safety rules

### Запрещено
- Удалять `.jar` навсегда.
- Заменять файлы без backup.
- Считать файл скачанным без SHA-512 проверки.
- Давать renderer прямой доступ к `fs`.
- Сканировать весь диск.
- Запускать Minecraft.

### Обязательно
- SHA-512 проверка.
- `.download` temp files.
- 3 retry.
- Backup before replace.
- Disabled folder for extra.
- Recovery after interrupted sync.
- User-friendly errors.

---

## 20. MVP success criteria

1. Приложение запускается в dev mode.
2. Можно выбрать папку mods.
3. Можно скачать manifest по URL.
4. Можно просканировать 30–60 `.jar` файлов.
5. Можно посчитать SHA-512.
6. Можно построить SyncPlan.
7. Можно скачать missing mods.
8. Можно заменить wrong_hash mods с backup.
9. Можно перенести extra mods в `_disabled_by_krofne_pack`.
10. Можно увидеть summary и detailed table.
11. Можно открыть backups page и сделать rollback.
12. Можно сгенерировать manifest.draft.json в admin mode.
13. Renderer не имеет прямого доступа к Node.js.
14. Нет необратимого удаления файлов.
15. README объясняет запуск и сборку.
16. `package:win` создаёт Windows installer.
