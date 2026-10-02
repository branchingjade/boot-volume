import { call, definePlugin } from "@decky/api";
import {
  ButtonItem,
  DropdownItem,
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
} from "@decky/ui";
import { useEffect, useRef, useState } from "react";
import { FaVolumeDown } from "react-icons/fa";
import { Lang, LANGS, loadLang, saveLang, strings } from "./i18n";

type Settings = {
  enabled: boolean;
  anim_volume: number;
  current_volume: number | null;
  current_sink: string | null;
  sinks: Record<string, number>;
  auto_seconds: number;
};

function BootVolumePanel() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const t = strings[lang];

  const [enabled, setEnabled] = useState(true);
  const [animVolume, setAnimVolume] = useState(20);
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [currentSink, setCurrentSink] = useState<string | null>(null);
  const [autoSeconds, setAutoSeconds] = useState(6);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  const refresh = () =>
    call<[], Settings>("get_settings")
      .then((s) => {
        setError(null);
        setEnabled(s.enabled);
        setAnimVolume(s.anim_volume);
        setCurrentVolume(s.current_volume);
        setCurrentSink(s.current_sink ?? null);
        setAutoSeconds(s.auto_seconds ?? 6);
      })
      .catch((e) => setError(String(e)));

  useEffect(() => {
    refresh();
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const onAnimVolume = (value: number) => {
    const next = Math.round(value);
    setAnimVolume(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      call("set_anim_volume", next).catch((e) => setError(String(e)));
    }, 200);
  };

  return (
    <PanelSection title={t.sectionTitle}>
      <PanelSectionRow>
        <ToggleField
          label={t.enableLabel}
          description={t.enableDescription}
          checked={enabled}
          onChange={(val) => {
            setEnabled(val);
            call("set_enabled", val).catch((e) => setError(String(e)));
          }}
        />
      </PanelSectionRow>

      <PanelSectionRow>
        <SliderField
          label={t.volumeLabel(animVolume)}
          description={t.volumeDescription(
            currentSink ?? t.unknownOutput,
            currentVolume == null ? "?" : currentVolume + "%"
          )}
          value={animVolume}
          min={0}
          max={100}
          step={1}
          disabled={!enabled}
          onChange={onAnimVolume}
        />
      </PanelSectionRow>

      <PanelSectionRow>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }}>
          {t.durationNote(autoSeconds.toFixed(1))}
        </div>
      </PanelSectionRow>

      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={!enabled || previewing}
          onClick={() => {
            if (!enabled || previewing) return;
            setPreviewing(true);
            setError(null);
            call("preview_duck")
              .then(() => {
                window.setTimeout(() => {
                  setPreviewing(false);
                  refresh();
                }, 5000);
              })
              .catch((e) => {
                setPreviewing(false);
                setError(String(e));
              });
          }}
        >
          {previewing ? t.previewBusy : t.previewIdle}
        </ButtonItem>
      </PanelSectionRow>

      {error && (
        <PanelSectionRow>
          <div style={{ fontSize: "0.75rem", color: "#ff8a8a", padding: "0 16px" }}>
            {error}
          </div>
        </PanelSectionRow>
      )}

      <PanelSectionRow>
        <DropdownItem
          label={t.languageLabel}
          rgOptions={LANGS}
          selectedOption={lang}
          onChange={(option) => {
            const next = option.data as Lang;
            setLang(next);
            saveLang(next);
          }}
        />
      </PanelSectionRow>

      <PanelSectionRow>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }}>
          {t.footer}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => ({
  name: "BootVolume",
  content: <BootVolumePanel />,
  icon: <FaVolumeDown />,
  onDismount() {},
}));
