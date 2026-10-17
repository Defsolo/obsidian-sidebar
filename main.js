const {
  FuzzySuggestModal,
  ItemView,
  Keymap,
  Menu,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  getLanguage,
  normalizePath,
  setIcon,
  setTooltip,
} = require("obsidian");

const VIEW_TYPE = "sectioned-sidebar-view";
const LANGUAGE_OPTIONS = new Set(["auto", "zh", "en"]);
// LOCAL-PATCH 23: LEADING_EMOJI_RE / ICON_CHOICES / DEFAULT_SECTIONS 的 icon 字段已删
// (PATCH 15 行首不再有图标槽、PATCH 10 起分区图标已取消,这些常量与字段没有任何引用了)
// LOCAL-PATCH 44: Iconic 的命名色都落在 Obsidian 的 CSS 变量上(与它 toRgb 的映射一致),别的值原样用
const ICONIC_COLOR_VARS = Object.freeze({
  red: "--color-red",
  orange: "--color-orange",
  yellow: "--color-yellow",
  green: "--color-green",
  cyan: "--color-cyan",
  blue: "--color-blue",
  purple: "--color-purple",
  pink: "--color-pink",
  gray: "--color-base-70",
});
function iconicColorCss(color) {
  if (!color) return "";
  const variable = ICONIC_COLOR_VARS[color];
  if (variable) return `var(${variable})`;
  return typeof CSS === "undefined" || CSS.supports?.("color", color) ? color : "";
}

const DEFAULT_SECTIONS = [
  { key: "defaultFavorites" },
  { key: "defaultShared" },
  { key: "defaultPersonal", includeRootFolders: true },
  { key: "defaultOther" },
];

const TRANSLATIONS = {
  zh: {
    name: "名称",
    cancel: "取消",
    save: "保存",
    confirm: "确认",
    nameRequired: "名称不能为空",
    searchAdd: "搜索要加入导航的文件夹或笔记…",
    navigation: "导航",
    // LOCAL-PATCH 23: newSection / navigationSettings 两个键已删(界面上没有对应元素)
    addToSection: "在“{name}”中添加",
    editSection: "编辑“{name}”",
    addFolderOrNote: "添加文件夹或笔记",
    removeMissingItem: "移除失效项目",
    folder: "文件夹",
    note: "笔记",
    manageItem: "管理 {name}",
    newFolder: "新建文件夹",
    addExistingFolderOrNote: "添加已有文件夹或笔记",
    addCurrentNote: "添加当前笔记",
    addExistingItem: "添加已有项目",
    renameSection: "重命名分区",
    moveUp: "上移",
    moveDown: "下移",
    deleteSection: "删除分区",
    openInNewTab: "在新标签页中打开",
    openInNewPane: "在新标签组中打开",
    newNote: "新建笔记",
    duplicate: "创建副本",
    rename: "重命名",
    delete: "删除",
    cannotCreateNote: "无法新建笔记：{error}",
    cannotCreateFolder: "无法新建文件夹：{error}",
    copyCreated: "已创建副本：{path}",
    cannotCreateCopy: "无法创建副本：{error}",
    navigationManagement: "导航管理",
    collapseFolder: "收起文件夹",
    expandFolder: "展开文件夹",
    moveToSection: "移到“{name}”",
    removeFromNavigation: "从导航移除",
    // LOCAL-PATCH 39: 拖放
    movedToRoot: "已移到库根目录",
    movedIntoFolder: "已移到“{folder}”",
    cannotMoveIntoSelf: "不能把文件夹移到它自己或它的子文件夹里",
    moveTargetExists: "目标位置已有同名项目：{name}",
    cannotMove: "无法移动：{error}",
    generalHeading: "通用设置",
    appearanceHeading: "配色与字号",
    // LOCAL-PATCH 17: settingsIntro / colorHeading / sizeHeading 三个键已删(不再有对应的界面元素)
    colorTitle: "分区字色",
    colorRow: "行字色",
    sizeTitle: "分区字号",
    sizeRow: "行字号",
    // LOCAL-PATCH 37: 这四行的说明小字加回来了,内容就是各字段的默认值(留空 = 用默认)
    colorTitleDesc: "默认跟主题的次要文字色一致",
    colorRowDesc: "默认跟主题的正文文字色一致；展开的文件夹用主题色",
    sizeTitleDesc: "默认 12px",
    sizeRowDesc: "默认 14px",
    // LOCAL-PATCH 9
    hideFromNavigation: "从导航隐藏",
    liveSectionEmpty: "根目录里没有可显示的项目",
    liveSectionDesc: "系统分区，自动收录",
    liveSectionExcludedDesc: "，排除{count}项",
    clearExclude: "清空排除(把隐藏的都放回来)",
    // LOCAL-PATCH 22: 系统分区收不下的项,给一句明确的话,不再点了没反应
    cannotHoldInLiveSection: "“{name}”只收录库根目录的{kind}，这一项加不进来",
    // LOCAL-PATCH 24: 工具条三个按钮 + 排序方式 + 与原生存否的开关
    sortTooltip: "排序方式：{name}",
    sortAlphabetical: "名称 A→Z",
    sortAlphabeticalReverse: "名称 Z→A",
    sortByModifiedNew: "修改时间 新→旧",
    sortByModifiedOld: "修改时间 旧→新",
    sortByCreatedNew: "创建时间 新→旧",
    sortByCreatedOld: "创建时间 旧→新",
    // LOCAL-PATCH 43: 排序对固定分区不生效(那块永远 文件夹在前 + 加入先后倒序),菜单尾说明一句
    sortFixedSectionNote: "固定分区里固定按加入先后排列",
    revealActiveFile: "自动显示当前文件夹",
    expandAll: "全部展开",
    collapseAll: "全部折叠",
    keepNativeExplorer: "保留文件列表",
    // LOCAL-PATCH 36: 注释行加回来(用户:行高不齐很丑),文案精简
    keepNativeExplorerDesc: "关掉后打开导航会收起原生文件列表",
    // LOCAL-PATCH 23: language / languageDesc / followObsidian / simplifiedChinese / english 已删
    // (PATCH 2 删掉了语言下拉,界面固定中文,这几个键不再有对应元素)
    openAtStartup: "启动时打开导航",
    openAtStartupDesc: "在左侧栏创建并显示导航标签。",
    topLevelSections: "分区",
    navigationItemCountOne: "{count} 个导航项目",
    navigationItemCountOther: "{count} 个导航项目",
    sectionName: "分区名称",
    renameHint: "双击改名",
    // LOCAL-PATCH 23: 10 个 icon* 键已删(只在死常量 ICON_CHOICES 里被引用)
    addTopLevelSection: "新建分区",
    // LOCAL-PATCH 36: 同上,注释行加回来(用上游原句,本来就够短)
    addTopLevelSectionDesc: "分区名称之后可以修改。",
    // LOCAL-PATCH 25: 同一个动作全部叫「新建分区」——工具条那个按钮 + 设置页那一行(行名与按钮) + 命令面板
    // 三个键值一样是故意的:addTopLevelSection 也是命令名用的 i18n 键,不能删
    newSectionButton: "新建分区",
    addSection: "新建分区",
    // LOCAL-PATCH 32: openSidebarNavigation(「打开侧边栏导航」)键已删 —— 它原来只给 ribbon 图标的 tooltip 用,
    // 图标撤了就成了死键;命令面板那条用的是 openNavigation(「打开导航」)
    openNavigation: "打开导航",
    addCurrentNoteToNavigation: "把当前笔记加入导航",
    unnamed: "未命名",
    defaultFavorites: "最爱",
    defaultShared: "共享",
    defaultPersonal: "私人",
    defaultOther: "其他",
    cannotCreateSidebar: "无法创建左侧导航标签",
    createSectionTitle: "新建分区",
    sectionNamePlaceholder: "例如：学习、工作、归档",
    create: "创建",
    renameSectionTitle: "重命名分区",
    deleteSectionTitle: "删除“{name}”？",
    deleteSectionDescription: "只会删除导航分区及其中的固定项，不会删除或移动任何真实文件。",
    createFolderInSectionTitle: "在“{name}”中新建文件夹",
    createFolderDescription: "文件夹会创建在 Obsidian 仓库根目录；导航分区本身不会成为真实路径。",
    folderName: "文件夹名称",
    folderNamePlaceholder: "例如：新项目",
    createFolder: "创建文件夹",
    // LOCAL-PATCH 40: 导航空白处右键的新建菜单
    newDatabase: "新建数据库",
    newFolderTitle: "新建文件夹",
    newFolderLocationDesc: "位置跟随 Obsidian 的「新文件位置」设置",
    cannotCreateBase: "无法新建数据库：{error}",
    invalidFolderName: "文件夹名称不能包含路径或系统保留字符",
    duplicateRootItem: "仓库根目录中已存在同名项目",
    folderCreated: "已创建文件夹：{path}",
    renameFolderTitle: "重命名文件夹",
    renameFileTitle: "重命名文件",
    fileName: "文件名",
    duplicateItemName: "同级中已存在同名项",
    invalidFileName: "文件名不能包含路径或系统保留字符",
    cannotRenameFolder: "无法重命名文件夹：{error}",
    cannotRenameFile: "无法重命名文件：{error}",
  },
  en: {
    name: "Name",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    nameRequired: "Name cannot be empty",
    searchAdd: "Search for a folder or note to add…",
    navigation: "Navigation",
    // LOCAL-PATCH 23: newSection / navigationSettings removed
    addToSection: "Add to “{name}”",
    editSection: "Edit “{name}”",
    addFolderOrNote: "Add a folder or note",
    removeMissingItem: "Remove missing item",
    folder: "Folder",
    note: "Note",
    manageItem: "Manage {name}",
    newFolder: "New folder",
    addExistingFolderOrNote: "Add existing folder or note",
    addCurrentNote: "Add current note",
    addExistingItem: "Add existing item",
    renameSection: "Rename section",
    moveUp: "Move up",
    moveDown: "Move down",
    deleteSection: "Delete section",
    openInNewTab: "Open in new tab",
    openInNewPane: "Open in new pane",
    newNote: "New note",
    duplicate: "Make a copy",
    rename: "Rename",
    delete: "Delete",
    cannotCreateNote: "Could not create note: {error}",
    cannotCreateFolder: "Could not create folder: {error}",
    copyCreated: "Copy created: {path}",
    cannotCreateCopy: "Could not create copy: {error}",
    navigationManagement: "Navigation management",
    collapseFolder: "Collapse folder",
    expandFolder: "Expand folder",
    moveToSection: "Move to “{name}”",
    removeFromNavigation: "Remove from navigation",
    // LOCAL-PATCH 39: drag & drop
    movedToRoot: "Moved to vault root",
    movedIntoFolder: "Moved to “{folder}”",
    cannotMoveIntoSelf: "A folder cannot be moved into itself or its subfolder",
    moveTargetExists: "An item with the same name already exists there: {name}",
    cannotMove: "Could not move: {error}",
    generalHeading: "General",
    appearanceHeading: "Colors & font size",
    // LOCAL-PATCH 17: settingsIntro / colorHeading / sizeHeading removed
    colorTitle: "Section color",
    colorRow: "Row color",
    sizeTitle: "Section size",
    sizeRow: "Row size",
    // LOCAL-PATCH 37
    colorTitleDesc: "Defaults to the theme's muted text color.",
    colorRowDesc: "Defaults to the theme's text color. Expanded folders use the accent color.",
    sizeTitleDesc: "Defaults to 12px.",
    sizeRowDesc: "Defaults to 14px.",
    // LOCAL-PATCH 9
    hideFromNavigation: "Hide from navigation",
    liveSectionEmpty: "Nothing to show from the vault root",
    liveSectionDesc: "System section, automatic",
    liveSectionExcludedDesc: ", {count} excluded",
    clearExclude: "Clear exclusions (bring hidden items back)",
    // LOCAL-PATCH 22
    cannotHoldInLiveSection: "“{name}” only follows root-level {kind}s; this item cannot be added",
    // LOCAL-PATCH 24
    sortTooltip: "Sort by: {name}",
    sortAlphabetical: "Name A→Z",
    sortAlphabeticalReverse: "Name Z→A",
    sortByModifiedNew: "Modified time, new to old",
    sortByModifiedOld: "Modified time, old to new",
    sortByCreatedNew: "Created time, new to old",
    sortByCreatedOld: "Created time, old to new",
    // LOCAL-PATCH 43
    sortFixedSectionNote: "Pinned sections always keep add order",
    revealActiveFile: "Auto-reveal current folder",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    keepNativeExplorer: "Keep the native file explorer",
    keepNativeExplorerDesc: "Off hides the native File explorer.",
    // LOCAL-PATCH 23: language keys removed (the language dropdown is gone)
    openAtStartup: "Open navigation on startup",
    openAtStartupDesc: "Create and show the Navigation tab in the left sidebar.",
    topLevelSections: "Sections",
    navigationItemCountOne: "{count} navigation item",
    navigationItemCountOther: "{count} navigation items",
    sectionName: "Section name",
    renameHint: "Double-click to rename",
    // LOCAL-PATCH 23: the 10 icon* keys removed
    addTopLevelSection: "New section",
    addTopLevelSectionDesc: "You can change the section name later.",
    // LOCAL-PATCH 25
    newSectionButton: "New section",
    addSection: "New section",
    // LOCAL-PATCH 32: openSidebarNavigation removed (the ribbon icon is gone); the command uses openNavigation
    openNavigation: "Open navigation",
    addCurrentNoteToNavigation: "Add current note to navigation",
    unnamed: "Untitled",
    defaultFavorites: "Favorites",
    defaultShared: "Shared",
    defaultPersonal: "Personal",
    defaultOther: "Other",
    cannotCreateSidebar: "Could not create the Navigation tab",
    createSectionTitle: "New section",
    sectionNamePlaceholder: "For example: Study, Work, Archive",
    create: "Create",
    renameSectionTitle: "Rename section",
    deleteSectionTitle: "Delete “{name}”?",
    deleteSectionDescription: "This removes only the navigation section and its pinned items. It will not delete or move any real files.",
    createFolderInSectionTitle: "Create a folder in “{name}”",
    createFolderDescription: "The folder will be created at the vault root. Navigation sections do not become real paths.",
    folderName: "Folder name",
    folderNamePlaceholder: "For example: New project",
    createFolder: "Create folder",
    // LOCAL-PATCH 40: blank-area create menu
    newDatabase: "New database",
    newFolderTitle: "New folder",
    newFolderLocationDesc: "Location follows Obsidian's “Default location for new notes” setting",
    cannotCreateBase: "Could not create database: {error}",
    invalidFolderName: "Folder names cannot contain path separators or reserved system characters",
    duplicateRootItem: "An item with that name already exists at the vault root",
    folderCreated: "Folder created: {path}",
    renameFolderTitle: "Rename folder",
    renameFileTitle: "Rename file",
    fileName: "File name",
    duplicateItemName: "An item with that name already exists here",
    invalidFileName: "File names cannot contain path separators or reserved system characters",
    cannotRenameFolder: "Cannot rename folder: {error}",
    cannotRenameFile: "Cannot rename file: {error}",
  },
};

function createId(prefix = "section") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniquePaths(paths) {
  return [...new Set(paths.filter(Boolean))];
}

// LOCAL-PATCH 3 / 6: 色号与字号的校验(空串 = 回落默认)
const COLOR_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const SIZE_RE = /^(?:9|1[0-9]|2[0-4])$/;

function sanitizeColors(value) {
  const source = value && typeof value === "object" ? value : {};
  const pick = (candidate) =>
    typeof candidate === "string" && COLOR_RE.test(candidate.trim()) ? candidate.trim() : "";
  return { title: pick(source.title), row: pick(source.row) };
}

// LOCAL-PATCH 8: 设置页一级分区名称框的定宽(不定宽时各行控件随内容漂移)
// LOCAL-PATCH 21: SECTION_NAME_INPUT_WIDTH(164px 定宽,原 PATCH 8)已删——宽度交给 Obsidian 原生默认

function sanitizeSizes(value) {
  const source = value && typeof value === "object" ? value : {};
  const pick = (candidate) =>
    typeof candidate === "string" && SIZE_RE.test(candidate.trim()) ? candidate.trim() : "";
  return { title: pick(source.title), row: pick(source.row) };
}

// LOCAL-PATCH 38: 颜色输入框的灰色占位提示 = 该字段在当前主题下的默认色(hex)。
// 默认值本身是主题色(var(--notion-nav-muted / -text),可能带透明度),而输入框只收 hex(COLOR_RE),
// 所以按导航底色合成成不透明色再当占位提示。导航没开着时临时挂一个隐藏的 .sectioned-sidebar-view 量一次。
function defaultColorPlaceholders() {
  const fallback = { title: "#999999", row: "#999999" };
  if (typeof document === "undefined" || !document.body) return fallback;

  const parse = (value) => {
    const text = (value || "").trim();
    const hex = text.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      const digits = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
      if (digits.length !== 6 && digits.length !== 8) return null;
      return [
        parseInt(digits.slice(0, 2), 16),
        parseInt(digits.slice(2, 4), 16),
        parseInt(digits.slice(4, 6), 16),
        digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
      ];
    }
    const rgb = text.match(/^rgba?\(([^)]+)\)$/i);
    if (!rgb) return null;
    const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    return [parts[0], parts[1], parts[2], Number.isNaN(parts[3]) ? 1 : parts[3]];
  };

  let probe = document.querySelector(".sectioned-sidebar-view");
  let temp = null;
  if (!probe) {
    temp = document.body.createDiv({ cls: "sectioned-sidebar-view" });
    temp.setCssProps({ position: "fixed", left: "-9999px", top: "0", width: "1px", height: "1px", visibility: "hidden" });
    probe = temp;
  }
  const read = (name) => getComputedStyle(probe).getPropertyValue(name).trim();
  const bg = parse(read("--notion-nav-bg")) || [255, 255, 255, 1];
  const toHex = (value, fallbackValue) => {
    const rgb = parse(value);
    if (!rgb) return fallbackValue;
    const composited = rgb.slice(0, 3).map((c, i) => Math.round(c * rgb[3] + bg[i] * (1 - rgb[3])));
    return `#${composited.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
  };
  const placeholders = {
    title: toHex(read("--notion-nav-muted"), fallback.title),
    row: toHex(read("--notion-nav-text"), fallback.row),
  };
  if (temp) temp.remove();
  return placeholders;
}

// LOCAL-PATCH 7: 一条路径只属于一个分区(最后设置的分区为准)。
// 老数据里重复的(补丁上线前手 pin 出来的)按分区顺序保留最靠前的那个:工作区 > 文件夹 > 文档。
// LOCAL-PATCH 9: 系统分区(根目录直连)。source 有值 = 这一节的内容实时取自库根目录,不靠 pin,
// 所以删不掉也没有东西可丢;新建的根文件夹/根文档会自动出现。
const LIVE_SOURCE_KINDS = { rootFolders: "folder", rootFiles: "file" };

function isLiveSection(section) {
  return Boolean(section && LIVE_SOURCE_KINDS[section.source]);
}

function sanitizeExclude(value) {
  return uniquePaths((Array.isArray(value) ? value : []).filter((path) => typeof path === "string" && path));
}

// 根目录直属项 = 路径里没有斜杠
function isRootChildPath(path) {
  return typeof path === "string" && path.length > 0 && !path.includes("/");
}

// LOCAL-PATCH 22:「添加已有文件夹或笔记」的选择器里不该出现的项 —— 点开头的隐藏目录
// (.obsidian/.trash/.archives)、依赖目录(node_modules),以及上游原本排除的两个前缀
const PICKER_EXCLUDED_PREFIXES = ["_raw/", "_assets/"];
const PICKER_EXCLUDED_SEGMENTS = new Set(["node_modules"]);

function isHiddenFromPicker(path) {
  if (PICKER_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return path
    .split("/")
    .some((segment) => segment.startsWith(".") || PICKER_EXCLUDED_SEGMENTS.has(segment));
}

// LOCAL-PATCH 24: 排序方式 = 核心文件列表同一套 6 个取值(名称/修改时间/创建时间 × 两个方向)
// 只影响「文件夹展开后的子项」和「系统分区的条目」;分区里手动排的固定项顺序不动
const SORT_ORDERS = [
  "alphabetical",
  "alphabeticalReverse",
  "byModifiedTime",
  "byModifiedTimeReverse",
  "byCreatedTime",
  "byCreatedTimeReverse",
];
const SORT_LABEL_KEYS = {
  alphabetical: "sortAlphabetical",
  alphabeticalReverse: "sortAlphabeticalReverse",
  byModifiedTime: "sortByModifiedNew",
  byModifiedTimeReverse: "sortByModifiedOld",
  byCreatedTime: "sortByCreatedNew",
  byCreatedTimeReverse: "sortByCreatedOld",
};

// 排除名单里若同时被别的分区 pin 着,这条排除既多余又挡住「移除后回落」,载入时清掉
function sanitizeLiveExcludes(sections) {
  const pinned = new Set();
  for (const section of sections) for (const path of section.items || []) pinned.add(path);
  for (const section of sections) {
    if (!isLiveSection(section)) continue;
    section.exclude = sanitizeExclude(section.exclude).filter((path) => !pinned.has(path));
  }
  return sections;
}

function dedupePinnedItems(sections) {
  const owner = new Map();
  for (const section of sections) {
    for (const path of section.items || []) if (!owner.has(path)) owner.set(path, section.id);
  }
  for (const section of sections) {
    section.items = (section.items || []).filter((path) => owner.get(path) === section.id);
  }
  return sections;
}

class NameModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
  }

  onOpen() {
    const { contentEl } = this;
    const t = this.options.t;
    contentEl.addClass("sectioned-sidebar-modal");
    contentEl.createEl("h2", { text: this.options.title });
    if (this.options.description) {
      contentEl.createEl("p", {
        cls: "sectioned-sidebar-modal-description",
        text: this.options.description,
      });
    }

    let value = this.options.initialValue || "";
    const setting = new Setting(contentEl).setName(this.options.label || t("name"));
    setting.addText((text) => {
      text.setValue(value).setPlaceholder(this.options.placeholder || "");
      text.onChange((next) => (value = next));
      window.setTimeout(() => {
        text.inputEl.focus();
        text.inputEl.select();
      }, 0);
      text.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") void submit();
      });
    });

    const actions = contentEl.createDiv({ cls: "sectioned-sidebar-modal-actions" });
    const cancel = actions.createEl("button", { text: t("cancel") });
    cancel.addEventListener("click", () => this.close());
    const confirm = actions.createEl("button", { cls: "mod-cta", text: this.options.confirmText || t("save") });
    confirm.addEventListener("click", () => void submit());

    const submit = async () => {
      const trimmed = value.trim();
      if (!trimmed) {
        new Notice(t("nameRequired"));
        return;
      }
      const accepted = await this.options.onSubmit(trimmed);
      if (accepted !== false) this.close();
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

class ConfirmModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
  }

  onOpen() {
    const { contentEl } = this;
    const t = this.options.t;
    contentEl.addClass("sectioned-sidebar-modal");
    contentEl.createEl("h2", { text: this.options.title });
    contentEl.createEl("p", {
      cls: "sectioned-sidebar-modal-description",
      text: this.options.description,
    });
    const actions = contentEl.createDiv({ cls: "sectioned-sidebar-modal-actions" });
    actions.createEl("button", { text: t("cancel") }).addEventListener("click", () => this.close());
    actions
      .createEl("button", { cls: "mod-warning", text: this.options.confirmText || t("confirm") })
      .addEventListener("click", async () => {
        await this.options.onConfirm();
        this.close();
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class VaultItemSuggestModal extends FuzzySuggestModal {
  constructor(app, plugin, sectionId) {
    super(app);
    this.plugin = plugin;
    this.sectionId = sectionId;
    this.setPlaceholder(this.plugin.t("searchAdd"));
  }

  getItems() {
    // LOCAL-PATCH 22: 列表只算一次 —— Obsidian 每敲一个键都会重新调 getItems(),
    // 原来每次都全库过滤 + 重排,本库(2.4 万条)实测约 0.59s/键。真正的取列表逻辑在插件里。
    if (!this.pickerItems) this.pickerItems = this.plugin.collectPickerItems(this.sectionId);
    return this.pickerItems;
  }

  getItemText(item) {
    return item.path;
  }

  onChooseItem(item) {
    void this.plugin.addItemToSection(this.sectionId, item.path);
  }
}

class SectionedSidebarView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    // LOCAL-PATCH 39: 拖放状态(源行 / 当前高亮的落点)
    this.dragPath = null;
    this.dragRow = null;
    this.dropEl = null;
    this.dropClass = "";
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return this.plugin.t("navigation");
  }

  getIcon() {
    // LOCAL-PATCH 31: 插件图标 10-16 换成 folder-tree(原来 panel-left 跟旁边几个插件分不清)
    return "folder-tree";
  }

  async onOpen() {
    this.render();
  }

  render() {
    // LOCAL-PATCH 44: Iconic 可能比本插件晚装载(或在运行中重新启用),每次渲染顺手补挂一次
    this.plugin.watchIconicChanges();
    const { contentEl } = this;
    const previousScrollTop = contentEl.querySelector(".sectioned-sidebar-sections")?.scrollTop || 0;
    // LOCAL-PATCH 43: 每次 file-open / create 都整棵重建,键盘焦点会丢 —— 记住原来聚焦的那一行,建完再还回去
    const focusedPath = document.activeElement?.closest?.(".sectioned-sidebar-item")?.dataset?.path || "";
    contentEl.empty();
    contentEl.addClass("sectioned-sidebar-view");

    // LOCAL-PATCH 23: 活动文件与 pin 集合整轮 render 只取一次(行循环与子项循环里反复要用)
    this.activeFilePath = this.app.workspace.getActiveFile()?.path || "";
    this.pinnedPaths = new Set(this.plugin.settings.sections.flatMap((section) => section.items || []));

    // LOCAL-PATCH 24: 跟随当前笔记(默认关)—— 只在活动文件真的换了那一轮展开它所在的层级,并在渲染后滚到视野
    this.pendingReveal = false;
    if (this.plugin.settings.revealActiveFile && this.activeFilePath && this.activeFilePath !== this.lastRevealedPath) {
      this.lastRevealedPath = this.activeFilePath;
      this.plugin.revealPath(this.activeFilePath);
      this.pendingReveal = true;
    }

    // LOCAL-PATCH 4: 设置页的配色 / 字号 → CSS 变量(留空 = 不设变量 = 回落默认)
    {
      const colors = this.plugin.settings.colors || {};
      const sizes = this.plugin.settings.sizes || {};
      const setVar = (name, value) => {
        if (value) contentEl.style.setProperty(name, value);
        else contentEl.style.removeProperty(name);
      };
      setVar("--ss-title-color", colors.title);
      setVar("--ss-row-color", colors.row);
      setVar("--ss-title-size", sizes.title ? `${sizes.title}px` : "");
      setVar("--ss-row-size", sizes.row ? `${sizes.row}px` : "");
    }

    // LOCAL-PATCH 1: 顶部工具条曾删除(标记行,别删,补丁据此判重)
    // LOCAL-PATCH 24 / 43: 工具条四个按钮 —— 新建分区 + 三个状态开关(排序方式 / 自动显示当前文件夹 / 全部展开↔折叠)。
    // 「新建笔记」「新建文件夹」不放:分区 + 菜单里已有分区级新建,全局新建走 Cmd+N
    // 加一级分区 → 设置 → Sectioned Sidebar 底部;插件设置也走 Obsidian 设置
    const visibleFolders = this.plugin.collectVisibleFolders();
    const toolbar = contentEl.createDiv({ cls: "nav-buttons-container sectioned-sidebar-toolbar" });
    // LOCAL-PATCH 25: 「新建分区」放最前 —— 与核心文件列表一致:新建类动作在前,排序/显示/展开三个状态开关在后
    this.createToolbarButton(toolbar, "square-plus", this.plugin.t("newSectionButton"), () => this.plugin.promptCreateSection());
    const sortOrder = this.plugin.getSortOrder();
    this.createToolbarButton(
      toolbar,
      "arrow-up-narrow-wide",
      this.plugin.t("sortTooltip", { name: this.plugin.t(SORT_LABEL_KEYS[sortOrder]) }),
      (event) => this.openSortMenu(event)
    );
    this.createToolbarButton(
      toolbar,
      "gallery-vertical",
      this.plugin.t("revealActiveFile"),
      () => void this.plugin.toggleRevealActiveFile(),
      Boolean(this.plugin.settings.revealActiveFile)
    );
    const expandButton = this.createToolbarButton(
      toolbar,
      "chevrons-up-down",
      this.plugin.t(this.plugin.areAllVisibleFoldersExpanded(visibleFolders) ? "collapseAll" : "expandAll"),
      () => void this.plugin.toggleCollapseAll()
    );
    // LOCAL-PATCH 43: 一个可展开的文件夹都没有(典型:分区全收着)时,这颗按钮点了没反应 —— 置灰说明
    if (!visibleFolders.length) expandButton.disabled = true;

    const sectionsEl = contentEl.createDiv({ cls: "sectioned-sidebar-sections" });
    // LOCAL-PATCH 40: 导航空白处右键 = 新建菜单(笔记 / 文件夹 / 数据库);行与分区标题各有自己的菜单
    sectionsEl.addEventListener("contextmenu", (event) => {
      if (event.target?.closest?.(".sectioned-sidebar-row")) return;
      event.preventDefault();
      this.openCreateMenu(event);
    });
    for (const section of this.plugin.settings.sections) {
      this.renderSection(sectionsEl, section);
    }
    sectionsEl.scrollTop = previousScrollTop;
    // LOCAL-PATCH 24: 跟随当前笔记 —— 渲染完再滚,而且只在活动文件换了那一轮(它已在视野里就不动)
    if (this.pendingReveal) {
      this.pendingReveal = false;
      this.scrollActiveRowIntoView(sectionsEl);
    }
    if (focusedPath) this.restoreRowFocus(sectionsEl, focusedPath);
  }

  // LOCAL-PATCH 43: 重建后把焦点还给原来那一行(它还在的话);preventScroll —— 别把它自己又滚进视野
  restoreRowFocus(container, path) {
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(path) : path;
    container.querySelector(`.sectioned-sidebar-item[data-path="${escaped}"]`)?.focus({ preventScroll: true });
  }

  createIconButton(parent, icon, label, callback) {
    const button = parent.createEl("button", {
      cls: "sectioned-sidebar-icon-button clickable-icon",
      attr: { type: "button" },
    });
    setIcon(button, icon);
    button.createSpan({ cls: "sectioned-sidebar-sr-only", text: label });
    button.addEventListener("click", callback);
    return button;
  }

  // LOCAL-PATCH 24: 工具条按钮 —— Obsidian 原生 .clickable-icon + 原生悬浮提示(和行列里的按钮不同,
  // 后者用的是屏幕阅读器专用文字,没有悬浮提示)
  // LOCAL-PATCH 26: 类名跟核心文件列表那排一致(.nav-action-button),尺寸/间距/悬停都由主题给,
  // 不用自己填数值 —— 核心以后改样式,这里跟着变
  createToolbarButton(parent, icon, label, callback, active = false) {
    const button = parent.createEl("button", {
      cls: "clickable-icon nav-action-button sectioned-sidebar-toolbar-button",
      attr: { type: "button" },
    });
    setIcon(button, icon);
    setTooltip(button, label);
    if (active) button.addClass("is-active");
    button.addEventListener("click", callback);
    return button;
  }

  // LOCAL-PATCH 24: 排序方式菜单(6 个取值,和核心文件列表同一套;当前项打勾)
  openSortMenu(event) {
    const menu = new Menu();
    for (const order of SORT_ORDERS) {
      menu.addItem((item) =>
        item
          .setTitle(this.plugin.t(SORT_LABEL_KEYS[order]))
          .setChecked(this.plugin.getSortOrder() === order)
          .onClick(async () => {
            this.plugin.settings.sortOrder = order;
            await this.plugin.persist();
          })
      );
    }
    // LOCAL-PATCH 43: 固定分区不吃这个排序(见 sortPinnedItems),菜单尾用一行置灰的说明交代清楚,
    // 免得点了「修改时间新→旧」发现分区里纹丝不动以为坏了
    menu.addSeparator();
    menu.addItem((item) => item.setTitle(this.plugin.t("sortFixedSectionNote")).setDisabled(true));
    menu.showAtMouseEvent(event);
  }

  // LOCAL-PATCH 24: 只把当前笔记那一行滚进视野;它已经在视野里就不动(避免每次渲染都铀一下)
  scrollActiveRowIntoView(container) {
    const row = container.querySelector(".sectioned-sidebar-item.is-active");
    if (!row) return;
    const box = container.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    if (rowBox.top >= box.top && rowBox.bottom <= box.bottom) return;
    container.scrollTop += rowBox.top - box.top - Math.max(0, (box.height - rowBox.height) / 2);
  }

  renderSection(parent, section) {
    const sectionEl = parent.createDiv({ cls: "sectioned-sidebar-section" });
    sectionEl.dataset.sectionId = section.id;
    // LOCAL-PATCH 39: 系统分区 = 库根目录的落点(拖到这一节的标题或空白处 = 挪到库根)
    // LOCAL-PATCH 42: 固定分区也是落点 = 把项加进这一节(pin,不动磁盘),与右键「移到“分区名”」同一套
    if (isLiveSection(section)) this.attachRootDropTarget(sectionEl);
    else this.attachSectionDropTarget(sectionEl, section);

    const header = sectionEl.createDiv({
      cls: "sectioned-sidebar-row sectioned-sidebar-section-header",
      attr: { role: "button", tabindex: "0", "aria-expanded": String(!section.collapsed) },
    });

    // LOCAL-PATCH 23: 分区标题里的箭头与文件夹图标两个节点已删(它们本来就被 CSS display:none 掉)
    header.createSpan({ cls: "sectioned-sidebar-row-label", text: section.name });

    const actions = header.createDiv({ cls: "sectioned-sidebar-row-actions" });
    this.createIconButton(actions, "plus", this.plugin.t("addToSection", { name: section.name }), (event) => {
      event.stopPropagation();
      this.openAddMenu(section, event);
    });
    this.createIconButton(actions, "more-horizontal", this.plugin.t("editSection", { name: section.name }), (event) => {
      event.stopPropagation();
      this.openSectionMenu(section, event);
    });

    const toggle = () => void this.plugin.toggleSection(section.id);
    header.addEventListener("click", (event) => {
      if (!event.target.closest("button")) toggle();
    });
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
    // LOCAL-PATCH 11: 标题双击重命名已删(点标题只做展开/收起);改名走右键菜单或设置页
    header.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.openSectionMenu(section, event);
    });

    if (section.collapsed) return;

    const body = sectionEl.createDiv({ cls: "sectioned-sidebar-section-body" });
    // LOCAL-PATCH 7 / 9: 系统分区的内容实时取自库根目录;其余分区照旧看 pin,并去掉已归别处的
    const liveSection = isLiveSection(section);
    const validItems = liveSection
      ? this.plugin.collectLiveItems(section)
      : uniquePaths(section.items || []).filter(
          (path) => !this.plugin.isPinnedOutside(path, section.id)
        );
    // 系统分区的内容跟着根目录走(正文里不放「+ 添加文件夹或笔记」那颗按钮),空只可能是全被排除或被别的分区收走了
    // (头部那颗 + 仍在 —— 打开的新建/添加菜单已按类型收敛,见 openAddMenu)
    if (!validItems.length && liveSection) {
      body.createDiv({ cls: "sectioned-sidebar-live-empty", text: this.plugin.t("liveSectionEmpty") });
      return;
    }
    if (!validItems.length) {
      const empty = body.createEl("button", {
        cls: "sectioned-sidebar-empty",
        text: this.plugin.t("addFolderOrNote"),
        attr: { type: "button" },
      });
      empty.addEventListener("click", (event) => this.openAddMenu(section, event));
      return;
    }

    // LOCAL-PATCH 41: 固定分区 = 文件夹在前、文档在后;组内按加入先后倒序(后加的在前)
    const orderedItems = liveSection ? validItems : this.plugin.sortPinnedItems(validItems);
    for (const path of orderedItems) {
      const item = this.app.vault.getAbstractFileByPath(path);
      if (item) this.renderVaultItem(body, section, item, 0, true);
      else this.renderMissingItem(body, section, path);
    }
  }

  // LOCAL-PATCH 39: 拖放
  // 落点三类 —— 文件夹行(真移进这个文件夹)、系统分区(真移回库根)、固定分区(PATCH 42:只加进这一节,不动磁盘)。
  beginDrag(row, item, event) {
    // 行里的按钮自己有点击行为,从按钮上起拖不算拖文件
    if (event.target?.closest?.("button")) {
      event.preventDefault();
      return;
    }
    const transfer = event.dataTransfer;
    if (!transfer) return;
    this.dragPath = item.path;
    this.dragRow = row;
    transfer.effectAllowed = "move";
    transfer.setData("text/plain", item.path);
    // 延迟加类:拖拽图像是起拖那一刻截的,当场变淡会被截进去
    window.setTimeout(() => row.addClass("is-dragging"), 0);
  }

  endDrag() {
    this.dragPath = null;
    if (this.dragRow) {
      this.dragRow.removeClass?.("is-dragging");
      this.dragRow = null;
    }
    this.clearDropHighlight();
  }

  draggedItem() {
    return this.dragPath ? this.app.vault.getAbstractFileByPath(this.dragPath) : null;
  }

  setDropHighlight(element, cls) {
    if (this.dropEl === element && this.dropClass === cls) return;
    this.clearDropHighlight();
    this.dropEl = element;
    this.dropClass = cls;
    element.addClass(cls);
  }

  clearDropHighlight() {
    if (this.dropEl && this.dropClass) this.dropEl.removeClass?.(this.dropClass);
    this.dropEl = null;
    this.dropClass = "";
  }

  attachFolderDropTarget(row, folder) {
    const isValid = () => {
      const item = this.draggedItem();
      return Boolean(item) && this.plugin.canMoveVaultItemTo(item, folder);
    };
    row.addEventListener("dragover", (event) => {
      if (!isValid()) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      this.setDropHighlight(row, "is-drop-target");
    });
    row.addEventListener("dragleave", (event) => {
      // 在行内的子节点之间移动也会触发 dragleave,别当成离开
      if (event.relatedTarget && row.contains?.(event.relatedTarget)) return;
      if (this.dropEl === row) this.clearDropHighlight();
    });
    row.addEventListener("drop", (event) => {
      if (!isValid()) return;
      event.preventDefault();
      event.stopPropagation();
      const item = this.draggedItem();
      this.clearDropHighlight();
      this.dragPath = null;
      if (item) void this.plugin.moveVaultItemTo(item, folder);
    });
  }

  attachRootDropTarget(sectionEl) {
    const isValid = () => {
      const item = this.draggedItem();
      return Boolean(item) && this.plugin.canMoveVaultItemTo(item, this.app.vault.getRoot());
    };
    sectionEl.addEventListener("dragover", (event) => {
      if (!isValid()) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      this.setDropHighlight(sectionEl, "is-drop-root");
    });
    sectionEl.addEventListener("dragleave", (event) => {
      if (event.relatedTarget && sectionEl.contains?.(event.relatedTarget)) return;
      if (this.dropEl === sectionEl) this.clearDropHighlight();
    });
    sectionEl.addEventListener("drop", (event) => {
      if (!isValid()) return;
      event.preventDefault();
      event.stopPropagation();
      const item = this.draggedItem();
      this.clearDropHighlight();
      this.dragPath = null;
      if (item) void this.plugin.moveVaultItemTo(item, this.app.vault.getRoot());
    });
  }

  // LOCAL-PATCH 42: 固定分区的落点 —— 拖到这里 = 把项加进这一节(改分区归属,磁盘不动)。
  // 复用 addItemToSection:它会把这个路径从其它分区摘掉(live 区照样因为「已在别处 pin」不再显示)。
  attachSectionDropTarget(sectionEl, section) {
    const isValid = () => {
      if (!this.dragPath) return false;
      const item = this.draggedItem();
      if (!item) return false;
      // 已经在这一节里就不接(含被别的分区 pin 走时仍留在这个数组里的情况)
      return !(section.items || []).includes(item.path);
    };
    sectionEl.addEventListener("dragover", (event) => {
      if (!isValid()) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      this.setDropHighlight(sectionEl, "is-drop-root");
    });
    sectionEl.addEventListener("dragleave", (event) => {
      if (event.relatedTarget && sectionEl.contains?.(event.relatedTarget)) return;
      if (this.dropEl === sectionEl) this.clearDropHighlight();
    });
    sectionEl.addEventListener("drop", (event) => {
      if (!isValid()) return;
      event.preventDefault();
      event.stopPropagation();
      const item = this.draggedItem();
      this.clearDropHighlight();
      this.dragPath = null;
      if (item) void this.plugin.addItemToSection(section.id, item.path);
    });
  }

  renderMissingItem(parent, section, path) {
    const row = parent.createDiv({ cls: "sectioned-sidebar-row sectioned-sidebar-item is-file is-missing" });
    row.setCssProps({ "--nav-depth": "0" });
    const icon = row.createSpan({ cls: "sectioned-sidebar-slot" });
    setIcon(icon, "file-question");
    row.createSpan({ cls: "sectioned-sidebar-row-label", text: path });
    const actions = row.createDiv({ cls: "sectioned-sidebar-row-actions" });
    this.createIconButton(actions, "x", this.plugin.t("removeMissingItem"), () => {
      void this.plugin.removeItemFromSection(section.id, path);
    });
  }

  renderVaultItem(parent, section, item, depth, pinnedRoot) {
    const isFolder = item instanceof TFolder;
    const isExpanded = isFolder && this.plugin.isFolderExpanded(item.path);
    const activeFilePath = this.activeFilePath || "";
    const isActive = item instanceof TFile && activeFilePath === item.path;
    const containsActive = isFolder && activeFilePath.startsWith(`${item.path}/`);

    const row = parent.createDiv({
      cls: `sectioned-sidebar-row sectioned-sidebar-item ${isFolder ? "is-folder" : "is-file"}${
        isActive ? " is-active" : ""
      }${containsActive ? " is-active-parent" : ""}`,
      attr: {
        role: "button",
        tabindex: "0",
        // LOCAL-PATCH 43: 文件行不给这个属性(以前传 null,核心 createEl 不跳过的话 DOM 里会变成 aria-expanded="null")
        "aria-expanded": isFolder ? String(isExpanded) : undefined,
      },
    });
    row.setCssProps({ "--nav-depth": String(depth) });
    // LOCAL-PATCH 43: 重建后靠它把焦点还回原行
    row.dataset.path = item.path;
    // LOCAL-PATCH 39: 行可拖;文件夹行同时是落点(拖进去 = 移进这个文件夹)
    row.setAttr("draggable", "true");
    row.addEventListener("dragstart", (event) => this.beginDrag(row, item, event));
    row.addEventListener("dragend", () => this.endDrag());
    if (isFolder) this.attachFolderDropTarget(row, item);

    const disclosure = row.createSpan({ cls: "sectioned-sidebar-slot sectioned-sidebar-disclosure" });
    if (isFolder) setIcon(disclosure, isExpanded ? "chevron-down" : "chevron-right");
    // LOCAL-PATCH 15: 不再无条件生成行首图标槽(要显示 emoji 就把 emoji 留在名字里)
    // LOCAL-PATCH 23: presentationForItem / labelForItem / iconForItem 已删,名字直接取 item.name
    // LOCAL-PATCH 44: Iconic 只画原生文件列表,这里按它同一套判定补一格图标(没图标/没规则命中的行不动)
    const iconicIcon = this.getIconicIcon(item, isFolder);
    if (iconicIcon) {
      row.addClass("has-icon");
      this.renderIconicIcon(row.createSpan({ cls: "sectioned-sidebar-slot sectioned-sidebar-item-icon" }), iconicIcon);
    }
    row.createSpan({ cls: "sectioned-sidebar-row-label", text: item.name });

    if (pinnedRoot) {
      const actions = row.createDiv({ cls: "sectioned-sidebar-row-actions" });
      this.createIconButton(actions, "more-horizontal", this.plugin.t("manageItem", { name: item.name }), (event) => {
        event.stopPropagation();
        this.openItemMenu(section, item, event);
      });
    }

    const activate = (event) => {
      if (isFolder) void this.plugin.toggleFolder(item.path);
      else void this.app.workspace.openLinkText(item.path, "", event ? Keymap.isModEvent(event) : false);
    };
    row.addEventListener("click", (event) => {
      if (!event.target.closest("button")) activate(event);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(event);
      }
    });
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.openItemMenu(section, item, event, pinnedRoot);
    });

    if (isFolder && isExpanded) {
      const children = parent.createDiv({ cls: "sectioned-sidebar-children" });
      children.setCssProps({ "--nav-parent-depth": String(depth) });
      for (const child of this.sortedChildren(item)) {
        // LOCAL-PATCH 7: 子孙也去重——某个子目录已 pin 在别的分区时,这里不再当子项冒出
        // LOCAL-PATCH 23: 用 render 时算好的集合,不再逐个子项全库扫
        if (this.pinnedPaths.has(child.path)) continue;
        this.renderVaultItem(children, section, child, depth + 1, false);
      }
    }
  }

  // LOCAL-PATCH 44: 图标判定的来源是 Iconic 自己的 ruleManager(与原生列表同一个结果),没有规则再看显式设置;
  // 没装 Iconic、或它内部接口改名了,一律返回 null —— 导航照常渲染,不因为图标挂掉
  getIconicIcon(item, isFolder) {
    const iconic = this.app.plugins?.plugins?.iconic;
    if (!iconic || typeof iconic.getFileItem !== "function") return null;
    try {
      const entry = iconic.getFileItem(item.path);
      if (!entry) return null;
      const ruling = iconic.ruleManager?.checkRuling?.(isFolder ? "folder" : "file", entry.id) ?? entry;
      const icon = ruling.icon || entry.icon || ruling.iconDefault || entry.iconDefault || null;
      const color = ruling.color || entry.color || null;
      return icon || color ? { icon, color } : null;
    } catch (error) {
      return null;
    }
  }

  renderIconicIcon(el, { icon, color }) {
    // Iconic 存的是 lucide-xxx 或 emoji 原文(对应它自己的两个图标集合)
    if (icon && icon.startsWith("lucide-")) setIcon(el, icon);
    else if (icon) {
      el.setText(icon);
      el.style.setProperty("font-size", "14px");
    }
    const cssColor = iconicColorCss(color);
    if (cssColor) el.style.setProperty("color", cssColor);
  }

  sortedChildren(folder) {
    // LOCAL-PATCH 24: 文件夹在前(原有规则),组内按「排序方式」设置(默认名称)
    return [...folder.children].sort((left, right) => this.plugin.sortEntries(left, right));
  }

  // LOCAL-PATCH 40: 导航空白处右键 —— 新建笔记 / 新建文件夹 / 新建数据库。
  // 落点跟 Obsidian 的「新文件位置」设置走(核心 fileManager.getNewFileParent),与核心「新建数据库」一致。
  openCreateMenu(event) {
    const parent = this.plugin.getNewFileParent();
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("newNote"))
        .setIcon("edit")
        .onClick(() => void this.createNoteInFolder(parent))
    );
    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("newFolderTitle"))
        .setIcon("folder-plus")
        .onClick(() => this.plugin.promptCreateFolderIn(parent))
    );
    // Bases 是核心插件，关掉时连命令都不在，不显示这一项
    if (this.plugin.isBasesEnabled()) {
      menu.addItem((item) =>
        item
          .setTitle(this.plugin.t("newDatabase"))
          .setIcon("layout-list")
          .onClick(() => void this.plugin.createBaseInFolder(parent))
      );
    }
    menu.showAtMouseEvent(event);
  }

  openAddMenu(section, event) {
    const menu = new Menu();
    // LOCAL-PATCH 22: 系统分区只收对应类型 —— 「新建文件夹」只在该分区收文件夹时才出现
    const liveSection = isLiveSection(section);
    if (!liveSection || LIVE_SOURCE_KINDS[section.source] === "folder") {
      menu.addItem((item) =>
        item.setTitle(this.plugin.t("newFolder")).setIcon("folder-plus").onClick(() => this.plugin.promptCreateFolder(section.id))
      );
    }
    menu.addItem((item) =>
      item.setTitle(this.plugin.t("addExistingFolderOrNote")).setIcon("list-plus").onClick(() => {
        new VaultItemSuggestModal(this.app, this.plugin, section.id).open();
      })
    );
    const active = this.app.workspace.getActiveFile();
    // LOCAL-PATCH 22: 系统分区收不下、或本来就已经显示着的项,不再列出来(以前点了没反应)
    // (系统分区的 items 恒为空,老条件 !items.includes(path) 在那几个分区里形同虚设,
    //  所以改成看排除名单 —— 已经显示的项不在排除名单里)
    const canAddActive = Boolean(active) && Boolean(liveSection
      ? (section.exclude || []).includes(active.path) && this.plugin.canHoldLiveItem(section, active.path)
      : !(section.items || []).includes(active.path));
    if (canAddActive) {
      menu.addItem((item) =>
        item.setTitle(this.plugin.t("addCurrentNote")).setIcon("file-plus").onClick(() => {
          void this.plugin.addItemToSection(section.id, active.path);
        })
      );
    }
    menu.showAtMouseEvent(event);
  }

  openSectionMenu(section, event) {
    const index = this.plugin.settings.sections.findIndex((candidate) => candidate.id === section.id);
    const menu = new Menu();
    // LOCAL-PATCH 22: 同上 —— 收文档的系统分区不出现「新建文件夹」(建完也进不来)
    if (!isLiveSection(section) || LIVE_SOURCE_KINDS[section.source] === "folder") {
      menu.addItem((item) =>
        item.setTitle(this.plugin.t("newFolder")).setIcon("folder-plus").onClick(() => this.plugin.promptCreateFolder(section.id))
      );
    }
    menu.addItem((item) =>
      item.setTitle(this.plugin.t("addExistingItem")).setIcon("list-plus").onClick(() => {
        new VaultItemSuggestModal(this.app, this.plugin, section.id).open();
      })
    );
    menu.addSeparator();
    menu.addItem((item) =>
      item.setTitle(this.plugin.t("renameSection")).setIcon("pencil").onClick(() => this.plugin.promptRenameSection(section.id))
    );
    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("moveUp"))
        .setIcon("arrow-up")
        .setDisabled(index <= 0)
        .onClick(() => void this.plugin.moveSection(section.id, -1))
    );
    menu.addItem((item) =>
      item
        .setTitle(this.plugin.t("moveDown"))
        .setIcon("arrow-down")
        .setDisabled(index >= this.plugin.settings.sections.length - 1)
        .onClick(() => void this.plugin.moveSection(section.id, 1))
    );
    // LOCAL-PATCH 9: 系统分区跟着根目录走,没有内容可丢,不给删
    if (!isLiveSection(section)) {
      menu.addSeparator();
      menu.addItem((item) =>
        item.setTitle(this.plugin.t("deleteSection")).setIcon("trash-2").onClick(() => this.plugin.confirmDeleteSection(section.id))
      );
    }
    menu.showAtMouseEvent(event);
  }

  openItemMenu(section, item, event, pinnedRoot = true) {
    const menu = new Menu().addSections([
      "title",
      "open",
      "action-primary",
      "action",
      "info",
      "info.copy",
      "view",
      "system",
      "sectioned-sidebar",
      "",
      "danger",
    ]);

    if (item instanceof TFile) {
      menu.addItem((entry) =>
        entry
          .setSection("open")
          .setTitle(this.plugin.t("openInNewTab"))
          .setIcon("file-plus")
          .onClick(() => void this.app.workspace.openLinkText(item.path, "", "tab"))
      );
      menu.addItem((entry) =>
        entry
          .setSection("open")
          .setTitle(this.plugin.t("openInNewPane"))
          .setIcon("separator-vertical")
          .onClick(() => void this.app.workspace.openLinkText(item.path, "", "split"))
      );
    } else {
      menu.addItem((entry) =>
        entry
          .setSection("action-primary")
          .setTitle(this.plugin.t("newNote"))
          .setIcon("edit")
          .onClick(() => void this.createNoteInFolder(item))
      );
      menu.addItem((entry) =>
        entry
          .setSection("action-primary")
          .setTitle(this.plugin.t("newFolder"))
          .setIcon("folder-open")
          .onClick(() => void this.createFolderInFolder(item))
      );
    }

    menu.addItem((entry) =>
      entry
        .setSection("action")
        .setTitle(this.plugin.t("duplicate"))
        .setIcon("files")
        .onClick(() => void this.duplicateVaultItem(item))
    );
    menu.addItem((entry) =>
      entry
        .setSection("danger")
        .setTitle(this.plugin.t("rename"))
        .setIcon("edit-3")
        .onClick(() => this.plugin.renameVaultItem(item))
    );
    menu.addItem((entry) => {
      entry.setSection("danger").setTitle(this.plugin.t("delete")).setIcon("trash-2").onClick(() => {
        void this.app.fileManager.promptForDeletion(item);
      });
      entry.setWarning?.(true);
    });

    // Core and community plugins populate the rest of the same File Explorer
    // menu (move, bookmarks, copy paths, Finder, Canvas, Bases, and more).
    this.app.workspace.trigger("file-menu", menu, item, "file-explorer-context-menu", null);
    this.appendNavigationItems(menu, section, item, pinnedRoot);
    if (event.currentTarget) menu.setParentElement(event.currentTarget);
    menu.showAtMouseEvent(event);
  }

  async createNoteInFolder(folder) {
    try {
      const file = await this.app.fileManager.createNewMarkdownFile(folder);
      await this.app.workspace.getLeaf(false).openFile(file, {
        active: true,
        state: { mode: "source" },
        eState: { rename: "all" },
      });
    } catch (error) {
      new Notice(this.plugin.t("cannotCreateNote", { error: error.message || error }));
    }
  }

  async createFolderInFolder(folder) {
    try {
      const created = await this.app.fileManager.createNewFolder(folder);
      // LOCAL-PATCH 28: 新建出来的文件夹改名走 renameVaultItem(核心那个弹窗只服务文件,文件夹进去是 undefined)
      if (created) this.plugin.renameVaultItem(created);
    } catch (error) {
      new Notice(this.plugin.t("cannotCreateFolder", { error: error.message || error }));
    }
  }

  async duplicateVaultItem(item) {
    try {
      const path =
        item instanceof TFile
          ? this.app.vault.getAvailablePath(item.path.slice(0, -(item.extension.length + 1)), item.extension)
          : this.app.vault.getAvailablePath(item.path);
      const copy = await this.app.vault.copy(item, path);
      if (copy instanceof TFile) new Notice(this.plugin.t("copyCreated", { path: copy.path }));
    } catch (error) {
      new Notice(this.plugin.t("cannotCreateCopy", { error: error.message || error }));
    }
  }

  appendNavigationItems(menu, section, item, pinnedRoot = true) {
    const path = item.path;
    menu.addSections?.(["sectioned-sidebar"]);
    menu.setSectionSubmenu?.("sectioned-sidebar", {
      title: this.plugin.t("navigationManagement"),
      icon: "panel-left",
    });

    const inNavigationSection = (entry) => entry.setSection?.("sectioned-sidebar") || entry;
    if (item instanceof TFolder) {
      menu.addItem((entry) => {
        inNavigationSection(entry);
        return entry
          .setTitle(this.plugin.t(this.plugin.isFolderExpanded(path) ? "collapseFolder" : "expandFolder"))
          .setIcon(this.plugin.isFolderExpanded(path) ? "folder-closed" : "folder-open")
          .onClick(() => void this.plugin.toggleFolder(path));
      });
    }

    // LOCAL-PATCH 41: 分区内不再有「上移/下移」—— 排序固定为 文件夹在前 + 加入先后倒序。
    // PATCH 9: 系统分区里的项是实时收录的;「移到…」只列出收得下它的分区
    const liveSection = isLiveSection(section);
    if (pinnedRoot) {
      for (const target of this.plugin.settings.sections.filter(
        (candidate) =>
          candidate.id !== section.id &&
          (!isLiveSection(candidate) || this.plugin.canHoldLiveItem(candidate, path))
      )) {
        menu.addItem((entry) => {
          inNavigationSection(entry);
          // LOCAL-PATCH 10: 分区图标已删,菜单图标统一用文件夹
          return entry.setTitle(this.plugin.t("moveToSection", { name: target.name })).setIcon("folder").onClick(() => {
            void this.plugin.moveItemToSection(section.id, target.id, path);
          });
        });
      }
      menu.addItem((entry) => {
        inNavigationSection(entry);
        return entry
          .setTitle(this.plugin.t(isLiveSection(section) ? "hideFromNavigation" : "removeFromNavigation"))
          .setIcon("x")
          .onClick(() => {
            void this.plugin.removeItemFromSection(section.id, path);
          });
      });
    }
  }
}

class SectionedSidebarSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    // LOCAL-PATCH 17: 顶部那句说明文字不再显示(settingsIntro 键已删)
    // LOCAL-PATCH 2: 语言下拉已删除,界面固定中文(语言值仍在 data.json 里,固定 zh)

    // LOCAL-PATCH 17: 页面顺序 = 通用设置 → 分区 → 配色与字号
    new Setting(containerEl).setName(this.plugin.t("generalHeading")).setHeading();

    new Setting(containerEl)
      .setName(this.plugin.t("openAtStartup"))
      .setDesc(this.plugin.t("openAtStartupDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoOpen).onChange(async (value) => {
          this.plugin.settings.autoOpen = value;
          await this.plugin.persist();
        })
      );

    // LOCAL-PATCH 24 / 29 / 36: 「保留文件列表」—— 关着(默认)= 打开导航时关掉原生文件列表(两者内容重复);
    // 用户改成保留就不动它。关掉的只是这个视图,不是核心插件,随时能用命令面板开回来。
    // PATCH 29 曾去掉注释行,PATCH 36 按用户要求加回(行高不齐不好看)
    new Setting(containerEl)
      .setName(this.plugin.t("keepNativeExplorer"))
      .setDesc(this.plugin.t("keepNativeExplorerDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.keepNativeExplorer === true).onChange(async (value) => {
          this.plugin.settings.keepNativeExplorer = value;
          await this.plugin.persist();
          if (!value) this.plugin.hideNativeFileExplorer();
        })
      );

    new Setting(containerEl).setName(this.plugin.t("topLevelSections")).setHeading();
    for (const section of this.plugin.settings.sections) {
      // LOCAL-PATCH 16: 原来这里还要算 index,给下面的 上移/下移 按钮用,两个按钮已删
      const itemCount = (section.items || []).length;
      const setting = new Setting(containerEl)
        .setName(section.name)
        .setDesc(this.plugin.t(itemCount === 1 ? "navigationItemCountOne" : "navigationItemCountOther", {
          count: itemCount,
        }));
      // LOCAL-PATCH 19: 名称不再常驻一个输入框（与行标题重复）——行标题双击就地变输入框，
      // 回车/失焦落盘，Esc 取消；行标题就是名字的唯一呈现
      const nameEl = setting.nameEl || setting.settingEl.querySelector(".setting-item-name");
      if (nameEl) {
        nameEl.setAttr("title", this.plugin.t("renameHint"));
        nameEl.addEventListener("dblclick", (event) => {
          event.preventDefault();
          if (nameEl.querySelector("input")) return;
          nameEl.empty();
          // LOCAL-PATCH 21: 输入框与配色/字号那几行的输入框完全同一套——都用 Obsidian 原生
          // 外观、都不设宽度(实测原生输入框就是 164×30px,两边自动一致);PATCH 8 的定宽与
          // PATCH 20 的「下划线就地编辑」样式都已撤掉
          const input = nameEl.createEl("input", { type: "text" });
          input.placeholder = this.plugin.t("sectionName");
          input.value = section.name;
          input.focus();
          input.select();
          let done = false;
          const finish = async (commit) => {
            if (done) return;
            done = true;
            const next = input.value.trim();
            if (commit && next && next !== section.name) {
              section.name = next;
              await this.plugin.persist();
            }
            this.display();
          };
          input.addEventListener("keydown", (keyEvent) => {
            if (keyEvent.key === "Enter") {
              keyEvent.preventDefault();
              void finish(true);
            } else if (keyEvent.key === "Escape") {
              keyEvent.preventDefault();
              void finish(false);
            }
          });
          input.addEventListener("blur", () => void finish(true));
        });
      }
      // LOCAL-PATCH 16 / 30: 删除按钮不在设置页(分区标题右键菜单里有同款);上移/下移 10-16 按用户要求加回来了。
      // 按钮顺序由 addExtraButton 的先后决定:清空排除(仅系统分区且有排除项时)在前,再到上移/下移
      if (isLiveSection(section)) {
        // LOCAL-PATCH 29: 没有排除项时不再写排除数 —— 那半句(自带逗号)只在真排除过东西时才接上
        const excluded = (section.exclude || []).length;
        setting.setDesc(
          this.plugin.t("liveSectionDesc") + (excluded ? this.plugin.t("liveSectionExcludedDesc", { count: excluded }) : "")
        );
        if (excluded) {
          setting.addExtraButton((button) =>
            button
              .setIcon("rotate-ccw")
              .setTooltip(this.plugin.t("clearExclude"))
              .onClick(async () => {
                section.exclude = [];
                await this.plugin.persist();
                this.display();
              })
          );
        }
      }
      // LOCAL-PATCH 30: 上移/下移 —— 到尽头的那一头置灰,跟侧栏右键菜单里的判定一致
      const index = this.plugin.settings.sections.indexOf(section);
      const lastIndex = this.plugin.settings.sections.length - 1;
      setting.addExtraButton((button) =>
        button
          .setIcon("arrow-up")
          .setTooltip(this.plugin.t("moveUp"))
          .setDisabled(index <= 0)
          .onClick(async () => {
            await this.plugin.moveSection(section.id, -1);
            this.display();
          })
      );
      setting.addExtraButton((button) =>
        button
          .setIcon("arrow-down")
          .setTooltip(this.plugin.t("moveDown"))
          .setDisabled(index >= lastIndex)
          .onClick(async () => {
            await this.plugin.moveSection(section.id, 1);
            this.display();
          })
      );
    }

    // LOCAL-PATCH 29 / 36: 注释行去掉过又加回来 —— 少了它这行比别人矮,整段看着不齐
    new Setting(containerEl)
      .setName(this.plugin.t("addTopLevelSection"))
      .setDesc(this.plugin.t("addTopLevelSectionDesc"))
      .addButton((button) =>
        button.setButtonText(this.plugin.t("addSection")).setCta().onClick(() => {
          this.plugin.promptCreateSection(() => this.display());
        })
      );

    // LOCAL-PATCH 17: 配色与字号合并成一块,只留一个标题(原来是「配色」「字号」两行)
    new Setting(containerEl).setName(this.plugin.t("appearanceHeading")).setHeading();

    // LOCAL-PATCH 18 / 23 / 37: 说明小字 PATCH 18 去掉过(PATCH 23 顺手删了 descKey 参数),PATCH 37 按用户要求加回
    // —— 四行的注释都写默认值(留空 = 用默认)
    const addValueField = (nameKey, descKey, store, field, regex, save, placeholder) => {
      const setting = new Setting(containerEl)
        .setName(this.plugin.t(nameKey))
        .setDesc(this.plugin.t(descKey));
      setting.addText((text) =>
        text
          .setPlaceholder(placeholder)
          .setValue((this.plugin.settings[store] || {})[field] || "")
          .onChange(async (value) => {
            const trimmed = value.trim();
            const current = (this.plugin.settings[store] || {})[field] || "";
            // 空 = 回落默认;合法值才落盘,半截输入不动旧值
            const next = !trimmed || regex.test(trimmed) ? trimmed : current;
            await save.call(this.plugin, field, next);
          })
      );
    };
    // LOCAL-PATCH 38: 颜色输入框里的灰字 = 该字段在当前主题下的默认色(留空就用它)
    const colorDefault = defaultColorPlaceholders();
    addValueField("colorTitle", "colorTitleDesc", "colors", "title", COLOR_RE, this.plugin.setColor, colorDefault.title);
    addValueField("colorRow", "colorRowDesc", "colors", "row", COLOR_RE, this.plugin.setColor, colorDefault.row);

    // LOCAL-PATCH 6: 字号(与配色同属一块,不再单独起标题)
    addValueField("sizeTitle", "sizeTitleDesc", "sizes", "title", SIZE_RE, this.plugin.setSize, "12");
    addValueField("sizeRow", "sizeRowDesc", "sizes", "row", SIZE_RE, this.plugin.setSize, "14");
  }
}

module.exports = class SectionedSidebarPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE, (leaf) => new SectionedSidebarView(leaf, this));
    this.addSettingTab(new SectionedSidebarSettingTab(this.app, this));

    // LOCAL-PATCH 31 / 32: 功能区(左侧 ribbon)不放本插件的图标 —— 用户不要;
    // 导航仍用命令面板的「打开侧边栏导航」(open-navigation)打开,视图标签上的图标仍是 folder-tree(getIcon)
    this.registerLocalizedCommand("openNavigation", {
      id: "open-navigation",
      callback: () => void this.activateView(),
    });
    this.registerLocalizedCommand("addTopLevelSection", {
      id: "add-section",
      callback: () => this.promptCreateSection(),
    });
    this.registerLocalizedCommand("addCurrentNoteToNavigation", {
      id: "add-active-file",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.openSectionPicker(file.path);
        return true;
      },
    });

    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshView()));
    this.registerEvent(this.app.vault.on("create", () => this.refreshView()));
    this.registerEvent(
      this.app.vault.on("delete", (item) => {
        void this.handleDelete(item.path);
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (item, oldPath) => {
        void this.handleRename(item.path, oldPath);
      })
    );

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoOpen) void this.activateView();
    });
  }

  async loadSettings() {
    const stored = await this.loadData();
    const language = LANGUAGE_OPTIONS.has(stored?.language) ? stored.language : "auto";
    if (stored?.sections?.length) {
      this.settings = {
        language,
        autoOpen: stored.autoOpen !== false,
        // LOCAL-PATCH 24: 排序方式 / 跟随当前笔记 / 打开导航时关掉原生文件列表
        sortOrder: SORT_ORDERS.includes(stored.sortOrder) ? stored.sortOrder : "alphabetical",
        revealActiveFile: stored.revealActiveFile === true,
        // LOCAL-PATCH 29: 存的是正向的「保留文件列表」(用户把设置页标签从「不与原生文件列表并存」改成「保留文件列表」,
        // 顺手把字段也改成正向,别再留个跟界面相反的负逻辑字段);旧版存的 hideNativeExplorer 在这里迁移
        keepNativeExplorer: typeof stored.keepNativeExplorer === "boolean"
          ? stored.keepNativeExplorer
          : stored.hideNativeExplorer === false,
        expandedFolders: uniquePaths(stored.expandedFolders || []).filter((path) => path !== "/"),
        colors: sanitizeColors(stored.colors),
        sizes: sanitizeSizes(stored.sizes),
        sections: sanitizeLiveExcludes(
          dedupePinnedItems(
            stored.sections.map((section) => ({
              id: section.id || createId(),
              name: section.name || this.translate(this.resolveLanguage(language), "unnamed"),
              collapsed: Boolean(section.collapsed),
              items: uniquePaths(section.items || []),
              // LOCAL-PATCH 9: 系统分区的来源与排除名单
              source: isLiveSection(section) ? section.source : "",
              exclude: sanitizeExclude(section.exclude),
            }))
          )
        ),
      };
    } else {
      this.settings = this.createDefaultSettings(language);
      await this.saveData(this.settings);
    }
    // LOCAL-PATCH 43: "/" 是旧数据留下的死条目(根目录从不参与展开判断),载入时直接丢
    this.expandedFolders = new Set((this.settings.expandedFolders || []).filter((path) => path && path !== "/"));
    // LOCAL-PATCH 43: 「跟随当前笔记」顺手展开的层级只留内存,不写回 data.json(见 expandAncestorsOf)
    this.transientExpanded = new Set();
  }

  createDefaultSettings(language = "auto") {
    const root = this.app.vault.getRoot();
    const privateFolders = root.children
      .filter((item) => item instanceof TFolder)
      // LOCAL-PATCH 43: 点开头的隐藏目录(.obsidian/.trash/.archives)不进默认分区 —— 与 collectLiveItems 口径一致
      .filter((folder) => !/^[._]/.test(folder.name))
      .map((folder) => folder.path)
      .sort((left, right) => left.localeCompare(right, this.getSortLocale(language), { numeric: true }));

    return {
      language,
      autoOpen: true,
      // LOCAL-PATCH 24 / 29: 默认按名称排、不自动跟随、默认不保留原生文件列表(两者内容重复)
      sortOrder: "alphabetical",
      revealActiveFile: false,
      keepNativeExplorer: false,
      expandedFolders: [],
      colors: { title: "", row: "" },
      sizes: { title: "", row: "" },
      sections: DEFAULT_SECTIONS.map((section) => ({
        id: createId(),
        name: this.translate(this.resolveLanguage(language), section.key),
        collapsed: false,
        items: section.includeRootFolders ? privateFolders : [],
      })),
    };
  }

  resolveLanguage(mode = this.settings?.language || "auto") {
    if (mode === "zh" || mode === "en") return mode;
    const appLanguage =
      (typeof getLanguage === "function" && getLanguage()) ||
      document.documentElement.lang ||
      navigator.language ||
      "en";
    return String(appLanguage).toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  translate(language, key, variables = {}) {
    const template = TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
    return template.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
    );
  }

  t(key, variables = {}) {
    return this.translate(this.resolveLanguage(), key, variables);
  }

  getSortLocale(mode = this.settings?.language || "auto") {
    return this.resolveLanguage(mode) === "zh" ? "zh-CN" : "en";
  }

  // LOCAL-PATCH 23: 语言下拉已删(PATCH 2),运行时切语言这条路走不到了 ——
  // refreshLocalizedChrome / setLanguage / localizedCommands 一并删掉,命令名在注册时定死
  registerLocalizedCommand(nameKey, command) {
    this.addCommand({ ...command, name: this.t(nameKey) });
  }

  // LOCAL-PATCH 3 / 6: 写入配色或字号并即时刷新导航
  async setColor(field, value) {
    this.settings.colors = this.settings.colors || { title: "", row: "" };
    this.settings.colors[field] = value;
    await this.persist();
  }

  async setSize(field, value) {
    this.settings.sizes = this.settings.sizes || { title: "", row: "" };
    this.settings.sizes[field] = value;
    await this.persist();
  }

  // LOCAL-PATCH 23: isPinnedAnywhere 已删(唯一调用点改用 render 时算好的 Set)

  // LOCAL-PATCH 7: 分区之间同一条路径不重复(最后设置的分区为准)
  isPinnedOutside(path, sectionId) {
    return this.settings.sections.some(
      (section) => section.id !== sectionId && (section.items || []).includes(path)
    );
  }

  detachFromOtherSections(sectionId, path) {
    for (const section of this.settings.sections) {
      if (section.id === sectionId) continue;
      section.items = (section.items || []).filter((itemPath) => itemPath !== path);
    }
  }

  // LOCAL-PATCH 9: 系统分区的内容 = 库根目录里对应类型的孩子,扣掉排除项、扣掉已归别的分区的
  collectLiveItems(section) {
    const kind = LIVE_SOURCE_KINDS[section.source];
    const excluded = new Set(sanitizeExclude(section.exclude));
    const root = this.app.vault.getRoot();
    return (root?.children || [])
      .filter((child) => (child instanceof TFolder ? "folder" : "file") === kind)
      .filter((child) => !child.name.startsWith("."))
      .filter((child) => !excluded.has(child.path))
      .filter((child) => !this.isPinnedOutside(child.path, section.id))
      // LOCAL-PATCH 24: 排序走统一的 sortEntries(文件夹在前 + 所选排序方式,默认名称)
      .sort((left, right) => this.sortEntries(left, right))
      .map((child) => child.path);
  }

  // LOCAL-PATCH 22: 排序比较器只建一次(localeCompare 每次内部新建,本库 2.4 万条实测 592ms → 34ms)
  getCollator(locale = this.getSortLocale()) {
    if (!this.collator || this.collatorLocale !== locale) {
      this.collatorLocale = locale;
      this.collator = new Intl.Collator(locale, { numeric: true });
    }
    return this.collator;
  }

  // LOCAL-PATCH 24: 排序方式存在插件自己的设置里,不碰核心文件列表的视图状态
  getSortOrder() {
    return SORT_ORDERS.includes(this.settings?.sortOrder) ? this.settings.sortOrder : "alphabetical";
  }

  // 同层且同类型时的比较(文件夹优先由 sortEntries 处理)
  compareBySortOrder(left, right) {
    const mtime = (item) => item?.stat?.mtime || 0;
    const ctime = (item) => item?.stat?.ctime || 0;
    switch (this.getSortOrder()) {
      case "byModifiedTime":
        return mtime(right) - mtime(left);
      case "byModifiedTimeReverse":
        return mtime(left) - mtime(right);
      case "byCreatedTime":
        return ctime(right) - ctime(left);
      case "byCreatedTimeReverse":
        return ctime(left) - ctime(right);
      case "alphabeticalReverse":
        return this.getCollator().compare(right.name, left.name);
      default:
        return this.getCollator().compare(left.name, right.name);
    }
  }

  // LOCAL-PATCH 41: 固定分区的项 = 文件夹在前、文档在后;组内按「加入分区的先后」倒序。
  // section.items 的顺序就是加入顺序(新加的都 append;手动上移/下移已删),所以用数组下标当加入先后。
  sortPinnedItems(paths) {
    const addedAt = new Map(paths.map((path, index) => [path, index]));
    const isFolder = (path) => this.app.vault.getAbstractFileByPath(path) instanceof TFolder;
    return [...paths].sort((left, right) => {
      const leftIsFolder = isFolder(left);
      const rightIsFolder = isFolder(right);
      if (leftIsFolder !== rightIsFolder) return leftIsFolder ? -1 : 1;
      return addedAt.get(right) - addedAt.get(left);
    });
  }

  // 文件夹在前(原有规则),组内按排序方式
  sortEntries(left, right) {
    const leftIsFolder = left instanceof TFolder;
    const rightIsFolder = right instanceof TFolder;
    if (leftIsFolder !== rightIsFolder) return leftIsFolder ? -1 : 1;
    return this.compareBySortOrder(left, right);
  }

  // LOCAL-PATCH 24 / 43: 跟随当前笔记 —— 展开它所在的所有层级。只改内存(transientExpanded),不落盘
  // (以前直接写 expandedFolders:下一次 persist —— 比如展开任何一个文件夹 —— 就把它一起存进了 data.json,
  //  而这些路径如果不在导航里,「全部折叠」也清不掉 → expandedFolders 只增不减)
  expandAncestorsOf(path) {
    const parts = String(path).split("/");
    let changed = false;
    for (let i = 1; i < parts.length; i += 1) {
      const ancestor = parts.slice(0, i).join("/");
      if (!this.isFolderExpanded(ancestor)) {
        this.transientExpanded.add(ancestor);
        changed = true;
      }
    }
    return changed;
  }

  // LOCAL-PATCH 24: 把「收录了这条笔记的收起分区」也展开 —— 否则分区收着的时候,
  // 里面的行根本没渲染出来,跟随就看不到东西
  revealPath(path) {
    let changed = this.expandAncestorsOf(path);
    for (const section of this.settings.sections) {
      if (!section.collapsed) continue;
      const items = isLiveSection(section) ? this.collectLiveItems(section) : uniquePaths(section.items || []);
      if (items.some((itemPath) => itemPath === path || String(path).startsWith(`${itemPath}/`))) {
        section.collapsed = false;
        changed = true;
      }
    }
    return changed;
  }

  // LOCAL-PATCH 24: 导航里可见的文件夹 = 各分区顶层项里的文件夹 + 它们的子目录,
  // 「全部展开」的作用范围;隐藏目录与 node_modules 不进(和选择器的过滤一致)
  collectVisibleFolders() {
    const folders = [];
    const seen = new Set();
    const walk = (folder, depth) => {
      if (depth > 12 || seen.has(folder.path) || isHiddenFromPicker(folder.path)) return;
      seen.add(folder.path);
      folders.push(folder.path);
      for (const child of folder.children || []) {
        if (child instanceof TFolder) walk(child, depth + 1);
      }
    };
    for (const section of this.settings.sections) {
      // 收起的分区里的文件夹不算「可见」——它们现在并不在屏幕上,也不该被「全部展开」顺手展开
      if (section.collapsed) continue;
      const paths = isLiveSection(section) ? this.collectLiveItems(section) : uniquePaths(section.items || []);
      for (const path of paths) {
        const item = this.app.vault.getAbstractFileByPath(path);
        if (item instanceof TFolder) walk(item, 1);
      }
    }
    return folders;
  }

  areAllVisibleFoldersExpanded(folders = this.collectVisibleFolders()) {
    return folders.length > 0 && folders.every((path) => this.isFolderExpanded(path));
  }

  // LOCAL-PATCH 24: 全部展开 ↔ 全部折叠(和核心文件列表那个按钮同一个语义)
  async toggleCollapseAll() {
    const folders = this.collectVisibleFolders();
    const collapse = this.areAllVisibleFoldersExpanded(folders);
    // LOCAL-PATCH 43: 跟随顺手展开的层级也一起收(它们现在确实开着),否则「全部折叠」看着没收干净
    this.transientExpanded.clear();
    if (collapse) {
      for (const path of folders) this.expandedFolders.delete(path);
    } else {
      for (const path of folders) this.expandedFolders.add(path);
    }
    await this.persist();
  }

  // LOCAL-PATCH 24: 跟随当前笔记的开关(工具条按钮直接切,状态落盘)
  async toggleRevealActiveFile() {
    this.settings.revealActiveFile = !this.settings.revealActiveFile;
    await this.persist();
  }

  // LOCAL-PATCH 24: 关掉原生文件列表(设置里的开关与「打开导航」都走这里)
  hideNativeFileExplorer() {
    for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) leaf.detach();
  }

  // LOCAL-PATCH 22:「添加已有文件夹或笔记」的候选列表 = 一个弹窗只算一次(见 VaultItemSuggestModal.getItems)
  collectPickerItems(sectionId) {
    const section = this.getSection(sectionId);
    const collator = this.getCollator();
    // 系统分区能收的只有「库根目录 + 对应类型」,所以列出来的就是被隐藏的那些(选它 = 放回导航)
    if (isLiveSection(section)) {
      return (section.exclude || [])
        .filter((path) => this.canHoldLiveItem(section, path))
        .sort(collator.compare);
    }
    const existing = new Set(section?.items || []);
    return this.app.vault
      .getAllLoadedFiles()
      .filter((item) => item.path !== "/")
      .filter((item) => item instanceof TFolder || item instanceof TFile)
      .filter((item) => !isHiddenFromPicker(item.path))
      .filter((item) => !existing.has(item.path))
      .sort((left, right) => {
        if (left instanceof TFolder && right instanceof TFile) return -1;
        if (left instanceof TFile && right instanceof TFolder) return 1;
        return collator.compare(left.path, right.path);
      });
  }

  // 这一节收得下这项吗(只有根目录的文件夹/文档才归系统分区管)
  canHoldLiveItem(section, path) {
    if (!isLiveSection(section) || !isRootChildPath(path)) return false;
    const item = this.app.vault.getAbstractFileByPath(path);
    if (!item) return false;
    return (item instanceof TFolder ? "folder" : "file") === LIVE_SOURCE_KINDS[section.source];
  }

  async persist() {
    this.settings.expandedFolders = [...this.expandedFolders];
    await this.saveData(this.settings);
    this.refreshView();
  }

  // LOCAL-PATCH 22: 批量创建/同步会连着触发很多次(create 逐条来),合并到一帧只重建一次
  // LOCAL-PATCH 44: Iconic 没有对外事件;包住它的保存/刷新入口,图标改完导航才看得到变化
  watchIconicChanges() {
    const iconic = this.app.plugins?.plugins?.iconic;
    if (!iconic || iconic.__sectionedSidebarWatched) return;
    iconic.__sectionedSidebarWatched = true;
    const refresh = () => this.refreshView();
    const wrap = (holder, name) => {
      if (!holder || typeof holder[name] !== "function") return;
      const original = holder[name];
      holder[name] = function (...args) {
        const result = original.apply(this, args);
        refresh();
        return result;
      };
    };
    wrap(iconic, "saveFileIcon");
    wrap(iconic, "refreshManagers");
    wrap(iconic.ruleManager, "updateRulings");
  }

  refreshView() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    window.requestAnimationFrame(() => {
      this.refreshQueued = false;
      for (const view of this.getNavigationViews()) view.render();
    });
  }

  getNavigationViews() {
    return this.app.workspace
      .getLeavesOfType(VIEW_TYPE)
      .map((leaf) => leaf.view)
      .filter((view) => view instanceof SectionedSidebarView);
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    const fileExplorerLeaf = this.app.workspace.getLeavesOfType("file-explorer")[0];

    // LOCAL-PATCH 24 / 29: 默认不保留原生文件列表(两者内容重复,设置里能改成保留)
    // 关掉的只是这个视图,不是核心插件;随时可以用命令面板「文件列表:显示文件列表」开回来
    if (!this.settings.keepNativeExplorer) {
      if (fileExplorerLeaf) this.hideNativeFileExplorer();
    } else if (leaf && fileExplorerLeaf && leaf.parent !== fileExplorerLeaf.parent) {
      // 并存:保持上游行为 —— 导航与原生文件列表同一栏、同一个标签组,不另起一栏
      leaf.detach();
      leaf = null;
    }

    if (!leaf) {
      leaf = this.app.workspace.getLeftLeaf(false);
      if (!leaf) {
        new Notice(this.t("cannotCreateSidebar"));
        return;
      }
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  getSection(sectionId) {
    return this.settings.sections.find((section) => section.id === sectionId);
  }

  promptCreateSection(afterCreate) {
    new NameModal(this.app, {
      t: (key, variables) => this.t(key, variables),
      title: this.t("createSectionTitle"),
      label: this.t("sectionName"),
      placeholder: this.t("sectionNamePlaceholder"),
      confirmText: this.t("create"),
      onSubmit: async (name) => {
        // LOCAL-PATCH 23: 不再往 data.json 里写 icon 字段(载入时本来就会丢掉)
        this.settings.sections.push({ id: createId(), name, collapsed: false, items: [] });
        await this.persist();
        afterCreate?.();
      },
    }).open();
  }

  promptRenameSection(sectionId) {
    const section = this.getSection(sectionId);
    if (!section) return;
    new NameModal(this.app, {
      t: (key, variables) => this.t(key, variables),
      title: this.t("renameSectionTitle"),
      label: this.t("sectionName"),
      initialValue: section.name,
      confirmText: this.t("rename"),
      onSubmit: async (name) => {
        section.name = name;
        await this.persist();
      },
    }).open();
  }

  confirmDeleteSection(sectionId, afterDelete) {
    const section = this.getSection(sectionId);
    if (!section) return;
    // LOCAL-PATCH 9: 系统分区不给删(设置页与右键菜单都藏了按钮,这里是兜底)
    if (isLiveSection(section)) return;
    new ConfirmModal(this.app, {
      t: (key, variables) => this.t(key, variables),
      title: this.t("deleteSectionTitle", { name: section.name }),
      description: this.t("deleteSectionDescription"),
      confirmText: this.t("deleteSection"),
      onConfirm: async () => {
        this.settings.sections = this.settings.sections.filter((candidate) => candidate.id !== sectionId);
        await this.persist();
        afterDelete?.();
      },
    }).open();
  }

  async toggleSection(sectionId) {
    const section = this.getSection(sectionId);
    if (!section) return;
    section.collapsed = !section.collapsed;
    await this.persist();
  }

  isFolderExpanded(path) {
    return this.expandedFolders.has(path) || this.transientExpanded.has(path);
  }

  async toggleFolder(path) {
    const open = this.isFolderExpanded(path);
    // LOCAL-PATCH 43: 用户手动点过的归持久化那份管(跟随顺手展开的那份清掉,别让两层状态打架)
    this.transientExpanded.delete(path);
    if (open) this.expandedFolders.delete(path);
    else this.expandedFolders.add(path);
    await this.persist();
  }

  // LOCAL-PATCH 40: 导航空白处的新建 —— 落点用核心的「新文件位置」设置(与核心「新建数据库」同一套)
  getNewFileParent() {
    const activePath = this.app.workspace.getActiveFile()?.path || "";
    const parent = this.app.fileManager.getNewFileParent?.(activePath);
    return parent instanceof TFolder ? parent : this.app.vault.getRoot();
  }

  isBasesEnabled() {
    return Boolean(this.app.commands?.findCommand?.("bases:new-file"));
  }

  async createBaseInFolder(folder) {
    try {
      // 核心「数据库:新建数据库」就是 createNewFile(parent, undefined, "base") + 带改名态打开
      const file = await this.app.fileManager.createNewFile(folder, undefined, "base");
      await this.app.workspace.getLeaf(false).openFile(file, { active: true, eState: { rename: "all" } });
    } catch (error) {
      new Notice(this.t("cannotCreateBase", { error: error.message || error }));
    }
  }

  promptCreateFolderIn(folder) {
    new NameModal(this.app, {
      t: (key, variables) => this.t(key, variables),
      title: this.t("newFolderTitle"),
      description: this.t("newFolderLocationDesc"),
      label: this.t("folderName"),
      placeholder: this.t("folderNamePlaceholder"),
      confirmText: this.t("createFolder"),
      onSubmit: async (name) => {
        if (/[\\/:*?"<>|]/.test(name)) {
          new Notice(this.t("invalidFolderName"));
          return false;
        }
        const path = normalizePath(folder.path ? `${folder.path}/${name}` : name);
        if (this.app.vault.getAbstractFileByPath(path)) {
          new Notice(this.t("duplicateItemName"));
          return false;
        }
        try {
          await this.app.vault.createFolder(path);
        } catch (error) {
          new Notice(this.t("cannotCreateFolder", { error: error.message || error }));
          return false;
        }
        new Notice(this.t("folderCreated", { path }));
        return true;
      },
    }).open();
  }

  promptCreateFolder(sectionId) {
    const section = this.getSection(sectionId);
    if (!section) return;
    new NameModal(this.app, {
      t: (key, variables) => this.t(key, variables),
      title: this.t("createFolderInSectionTitle", { name: section.name }),
      description: this.t("createFolderDescription"),
      label: this.t("folderName"),
      placeholder: this.t("folderNamePlaceholder"),
      confirmText: this.t("createFolder"),
      onSubmit: async (name) => {
        if (/[\\/:*?"<>|]/.test(name)) {
          new Notice(this.t("invalidFolderName"));
          return false;
        }
        const path = normalizePath(name);
        if (this.app.vault.getAbstractFileByPath(path)) {
          new Notice(this.t("duplicateRootItem"));
          return false;
        }
        await this.app.vault.createFolder(path);
        await this.addItemToSection(sectionId, path);
        new Notice(this.t("folderCreated", { path }));
        return true;
      },
    }).open();
  }

  // LOCAL-PATCH 28: 重命名导航里的项(文件夹与文件同一套弹窗)。
  // 原本文件夹与文件都交给核心的 fileManager.promptForFileRename —— 那个弹窗是给「文件」写的:
  // 初值取 file.basename,而 TFolder 没有 basename → 文件夹进去输入框直接显示 undefined,
  // 标题也停在给非 md 用的默认值。现在两种都走本插件弹窗(文案按类型分),只路径算法跟核心一致。
  // 文件沿用核心的习惯:输入框里只有不带扩展名的名字,提交时把原扩展名接回去。
  renameVaultItem(item) {
    if (!item) return;
    const isFolder = item instanceof TFolder;
    // 文件沿用核心的习惯:输入框里只有不带扩展名的名字,提交时再把原扩展名接回去
    const extension = isFolder ? "" : item.extension || "";
    const currentName = isFolder ? item.name : item.basename;
    new NameModal(this.app, {
      t: (key, variables) => this.t(key, variables),
      title: this.t(isFolder ? "renameFolderTitle" : "renameFileTitle"),
      label: this.t(isFolder ? "folderName" : "fileName"),
      initialValue: currentName,
      confirmText: this.t("rename"),
      onSubmit: async (name) => {
        if (/[\\/:*?"<>|]/.test(name)) {
          new Notice(this.t(isFolder ? "invalidFolderName" : "invalidFileName"));
          return false;
        }
        // 用户把扩展名也一起打进来时不再接一遍(比如 .md 文件里输入「说明.md」)
        const typed = extension && name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
          ? name.slice(0, -(extension.length + 1))
          : name;
        if (!typed) {
          new Notice(this.t(isFolder ? "invalidFolderName" : "invalidFileName"));
          return false;
        }
        if (typed === currentName) return true;
        const target = this.pathForRename(item, extension ? `${typed}.${extension}` : typed);
        if (this.app.vault.getAbstractFileByPath(target)) {
          new Notice(this.t("duplicateItemName"));
          return false;
        }
        try {
          await this.app.fileManager.renameFile(item, target);
        } catch (error) {
          new Notice(this.t(isFolder ? "cannotRenameFolder" : "cannotRenameFile", { error: error.message || error }));
          return false;
        }
        return true;
      },
    }).open();
  }

  // 目标路径与核心 TAbstractFile.getNewPathAfterRename 一致:根目录用名字,否则 父目录/名字
  // (item.parent 在库根时是那个根目录对象,path 为空串)
  pathForRename(item, name) {
    const parentPath = item.parent?.path || "";
    return normalizePath(parentPath ? `${parentPath}/${name}` : name);
  }

  // LOCAL-PATCH 39: 拖放的落点判定 —— 目标文件夹能不能收下这一项
  canMoveVaultItemTo(item, folder) {
    if (!item || !(folder instanceof TFolder)) return false;
    if (item === folder) return false;
    if (item instanceof TFolder && folder.path.startsWith(`${item.path}/`)) return false;
    return (item.parent?.path || "") !== folder.path;
  }

  // LOCAL-PATCH 39: 把项挪到目标文件夹(传 null = 库根)。只动磁盘路径,不动分区归属;
  // 已 pin 的路径与展开状态由 handleRename 跟着改。落点文件夹连同各级上层自动展开。
  async moveVaultItemTo(item, targetFolder) {
    const root = this.app.vault.getRoot();
    const folder = targetFolder || root;
    if (!item || !(folder instanceof TFolder)) return;
    if (item === folder || (item instanceof TFolder && folder.path.startsWith(`${item.path}/`))) {
      new Notice(this.t("cannotMoveIntoSelf"));
      return;
    }
    if ((item.parent?.path || "") === folder.path) return;
    const isRoot = !folder.path;
    const targetPath = normalizePath(isRoot ? item.name : `${folder.path}/${item.name}`);
    if (this.app.vault.getAbstractFileByPath(targetPath)) {
      new Notice(this.t("moveTargetExists", { name: item.name }));
      return;
    }
    try {
      await this.app.fileManager.renameFile(item, targetPath);
    } catch (error) {
      new Notice(this.t("cannotMove", { error: error.message || error }));
      return;
    }
    if (!isRoot) {
      const segments = folder.path.split("/");
      let changed = false;
      for (let i = 1; i <= segments.length; i += 1) {
        const path = segments.slice(0, i).join("/");
        if (!this.expandedFolders.has(path)) {
          this.expandedFolders.add(path);
          changed = true;
        }
      }
      if (changed) await this.persist();
    }
    new Notice(isRoot ? this.t("movedToRoot") : this.t("movedIntoFolder", { folder: folder.name }));
  }

  async addItemToSection(sectionId, path) {
    const section = this.getSection(sectionId);
    if (!section) return;
    // LOCAL-PATCH 9: 加到系统分区 = 取消排除(它本来就该跟着根目录显示在这一节)
    if (isLiveSection(section)) {
      // LOCAL-PATCH 22: 以前这里直接 return,点了没反应 —— 现在明确说一句
      if (!this.canHoldLiveItem(section, path)) {
        new Notice(
          this.t("cannotHoldInLiveSection", {
            name: section.name,
            kind: this.t(LIVE_SOURCE_KINDS[section.source] === "folder" ? "folder" : "note"),
          })
        );
        return;
      }
      this.detachFromOtherSections(sectionId, path);
      section.exclude = sanitizeExclude(section.exclude).filter((itemPath) => itemPath !== path);
      await this.persist();
      return;
    }
    // LOCAL-PATCH 7: 最后设置的分区为准 —— 加到哪里就从其余分区摘掉
    this.detachFromOtherSections(sectionId, path);
    section.items = uniquePaths([...(section.items || []), path]);
    await this.persist();
  }

  async removeItemFromSection(sectionId, path) {
    const section = this.getSection(sectionId);
    if (!section) return;
    // LOCAL-PATCH 9: 系统分区没有 pin 可摘 —— 移除 = 记进排除名单(设置页可一键清空)
    if (isLiveSection(section)) {
      section.exclude = uniquePaths([...(section.exclude || []), path]);
      await this.persist();
      return;
    }
    section.items = (section.items || []).filter((itemPath) => itemPath !== path);
    await this.persist();
  }

  async moveItemToSection(sourceId, targetId, path) {
    const source = this.getSection(sourceId);
    const target = this.getSection(targetId);
    if (!source || !target) return;
    // LOCAL-PATCH 9: 移到系统分区 = 摘掉原分区里的 pin + 取消排除,它便落回根目录那一节
    if (isLiveSection(target)) {
      if (!this.canHoldLiveItem(target, path)) return;
      source.items = source.items.filter((itemPath) => itemPath !== path);
      this.detachFromOtherSections(targetId, path);
      target.exclude = sanitizeExclude(target.exclude).filter((itemPath) => itemPath !== path);
      await this.persist();
      return;
    }
    source.items = source.items.filter((itemPath) => itemPath !== path);
    // LOCAL-PATCH 7: 目标分区以外的其它分区里也摘掉
    this.detachFromOtherSections(targetId, path);
    target.items = uniquePaths([...(target.items || []), path]);
    await this.persist();
  }

  async moveSection(sectionId, direction) {
    const index = this.settings.sections.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= this.settings.sections.length) return;
    [this.settings.sections[index], this.settings.sections[target]] = [
      this.settings.sections[target],
      this.settings.sections[index],
    ];
    await this.persist();
  }

  openSectionPicker(path) {
    const menu = new Menu();
    for (const section of this.settings.sections) {
      // LOCAL-PATCH 43: 和右键菜单同一套过滤 —— 系统分区收不下这一项就不列
      // (以前列了,点下去只弹一句「加不进来」)
      if (isLiveSection(section) && !this.canHoldLiveItem(section, path)) continue;
      menu.addItem((item) =>
        item.setTitle(section.name).setIcon("folder").onClick(() => {
          void this.addItemToSection(section.id, path);
        })
      );
    }
    const activeElement = document.activeElement;
    const rect = activeElement?.getBoundingClientRect?.();
    menu.showAtPosition({ x: rect?.left || 80, y: rect?.bottom || 80 });
  }

  // LOCAL-PATCH 43: 改名/移动时,路径与展开状态一起改写(以前 items / exclude / expandedFolders 各写一遍)
  remapPath(path, oldPath, newPath) {
    if (path === oldPath) return newPath;
    if (path.startsWith(`${oldPath}/`)) return `${newPath}${path.slice(oldPath.length)}`;
    return path;
  }

  async handleRename(newPath, oldPath) {
    let changed = false;
    const remapList = (paths) => {
      let touched = false;
      const mapped = paths.map((path) => {
        const next = this.remapPath(path, oldPath, newPath);
        if (next !== path) touched = true;
        return next;
      });
      return [mapped, touched];
    };

    for (const section of this.settings.sections) {
      const [items, itemsTouched] = remapList(section.items || []);
      section.items = items;
      changed = changed || itemsTouched;
      // LOCAL-PATCH 9: 系统分区的排除名单也跟着改名走
      if ((section.exclude || []).length) {
        const [excludes, excludesTouched] = remapList(section.exclude);
        section.exclude = excludes;
        changed = changed || excludesTouched;
      }
    }

    // LOCAL-PATCH 43: 真移动(换了父目录)时,若这一项已经住进同一分区里另一条 pin 的文件夹,
    // 就摘掉这条内层 pin —— 否则它按 pin 渲染在分区顶层,而那个文件夹里又看不到它
    // (PATCH 39 拖进文件夹 vs PATCH 41 固定项平铺 的冲突;档内改名/原位不动不碰)
    const parentOf = (path) => String(path).split("/").slice(0, -1).join("/");
    if (parentOf(oldPath) !== parentOf(newPath)) {
      for (const section of this.settings.sections) {
        const pinned = new Set(section.items || []);
        const insidePinned = (path) => {
          const parts = String(path).split("/");
          for (let i = 1; i < parts.length; i += 1) {
            if (pinned.has(parts.slice(0, i).join("/"))) return true;
          }
          return false;
        };
        const kept = (section.items || []).filter(
          (path) => !((path === newPath || path.startsWith(`${newPath}/`)) && insidePinned(path))
        );
        if (kept.length !== (section.items || []).length) {
          section.items = kept;
          changed = true;
        }
      }
    }

    const remapExpanded = (paths) => {
      const next = new Set();
      for (const path of paths) {
        const mapped = this.remapPath(path, oldPath, newPath);
        if (mapped !== path) changed = true;
        next.add(mapped);
      }
      return next;
    };
    this.expandedFolders = remapExpanded(this.expandedFolders);
    this.transientExpanded = remapExpanded(this.transientExpanded);
    if (changed) await this.persist();
    else this.refreshView();
  }

  async handleDelete(deletedPath) {
    const isDeletedPath = (path) => path === deletedPath || path.startsWith(`${deletedPath}/`);
    let changed = false;

    for (const section of this.settings.sections) {
      const items = section.items || [];
      section.items = items.filter((path) => !isDeletedPath(path));
      if (section.items.length !== items.length) changed = true;
      // LOCAL-PATCH 9: 文件已经没了,排除名单里的记录一并清掉
      const excluded = section.exclude || [];
      const keptExclude = excluded.filter((path) => !isDeletedPath(path));
      if (keptExclude.length !== excluded.length) {
        changed = true;
        section.exclude = keptExclude;
      }
    }

    const expanded = new Set([...this.expandedFolders].filter((path) => !isDeletedPath(path)));
    if (expanded.size !== this.expandedFolders.size) changed = true;
    this.expandedFolders = expanded;
    // LOCAL-PATCH 43: 跟随顺手展开的那份同步清
    const transient = new Set([...this.transientExpanded].filter((path) => !isDeletedPath(path)));
    this.transientExpanded = transient;

    if (changed) await this.persist();
    else this.refreshView();
  }
};
