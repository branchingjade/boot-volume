import { call, definePlugin } from "@decky/api";
import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  SliderField,
  ToggleField,
} from "@decky/ui";
import { useEffect, useRef, useState } from "react";
import { FaVolumeDown } from "react-icons/fa";

type Settings = {
  enabled: boolean;
  anim_volume: number;
  current_volume: number | null;
  current_sink: string | null;
  sinks: Record<string, number>;
  auto_seconds: number;
};

function BootVolumePanel() {
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
    <PanelSection title="Boot animation volume">
      <PanelSectionRow>
        <ToggleField
          label="Enable"
          description="Lower the system volume while Steam starts, then put it back. No system files are touched."
          checked={enabled}
          onChange={(val) => {
            setEnabled(val);
            call("set_enabled", val).catch((e) => setError(String(e)));
          }}
        />
      </PanelSectionRow>

      <PanelSectionRow>
        <SliderField
          label={`Volume during the animation: ${animVolume}%`}
          description={`Current output: ${currentSink ?? "unknown"} — ${
            currentVolume == null ? "?" : currentVolume + "%"
          }. It is set to the value above while the animation plays, then restored.`}
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
          {`Animation length measured from the startup movies on disk: ${autoSeconds.toFixed(
            1
          )}s (includes a safety margin).`}
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
          {previewing ? "Playing the startup sound…" : "Preview the duck"}
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
        <div style={{ fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }}>
          How it works: every audio output is temporarily set to the target volume, held for the
          measured animation length, then restored to the value it had before.
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
