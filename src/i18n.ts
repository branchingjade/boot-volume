/**
 * Tiny two-language dictionary for the plugin panel.
 *
 * Chinese is the default (as requested); the choice is remembered in
 * localStorage under a plugin-private key. Everything is wrapped in
 * try/catch because the Steam UI context can deny storage access.
 */

export type Lang = "zh" | "en";

const STORAGE_KEY = "boot-volume.lang";

export const LANGS: { data: Lang; label: string }[] = [
  { data: "zh", label: "中文" },
  { data: "en", label: "English" },
];

export function loadLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") {
      return saved;
    }
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return "zh";
}

export function saveLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export interface Strings {
  sectionTitle: string;
  languageLabel: string;
  enableLabel: string;
  enableDescription: string;
  volumeLabel: (volume: number) => string;
  volumeDescription: (output: string, current: string) => string;
  unknownOutput: string;
  durationNote: (seconds: string) => string;
  previewIdle: string;
  previewBusy: string;
  footer: string;
}

export const strings: Record<Lang, Strings> = {
  zh: {
    sectionTitle: "开机动画音量",
    languageLabel: "语言 / Language",
    enableLabel: "启用",
    enableDescription:
      "Steam 启动时压低系统音量，动画结束后还原。不会修改任何系统文件。",
    volumeLabel: (volume: number) => `动画期间音量：${volume}%`,
    volumeDescription: (output: string, current: string) =>
      `当前输出：${output} — ${current}。动画播放期间会被设成上面的数值，结束后恢复原值。`,
    unknownOutput: "未知设备",
    durationNote: (seconds: string) =>
      `按磁盘上实际安装的启动动画实测时长：${seconds}s（含安全余量）。`,
    previewIdle: "预览压低效果",
    previewBusy: "正在播放启动音效…",
    footer:
      "原理：动画开始时把所有音频输出临时设为设定音量，保持实测到的动画时长，然后逐个恢复为动画前的数值。",
  },
  en: {
    sectionTitle: "Boot animation volume",
    languageLabel: "语言 / Language",
    enableLabel: "Enable",
    enableDescription:
      "Lower the system volume while Steam starts, then put it back. No system files are touched.",
    volumeLabel: (volume: number) => `Volume during the animation: ${volume}%`,
    volumeDescription: (output: string, current: string) =>
      `Current output: ${output} — ${current}. It is set to the value above while the animation plays, then restored.`,
    unknownOutput: "unknown",
    durationNote: (seconds: string) =>
      `Animation length measured from the startup movies on disk: ${seconds}s (includes a safety margin).`,
    previewIdle: "Preview the duck",
    previewBusy: "Playing the startup sound…",
    footer:
      "How it works: every audio output is temporarily set to the target volume, held for the measured animation length, then restored to the value it had before.",
  },
};
