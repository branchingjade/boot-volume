import asyncio
import json
import os
import pwd
import re
import decky

SETTINGS_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")

_decky_home = os.environ.get("DECKY_HOME", "/home/deck/homebrew")
_deck_uid = os.stat(_decky_home).st_uid
_deck_user = pwd.getpwuid(_deck_uid).pw_name

DEFAULT_SETTINGS = {
    "enabled": True,
    "anim_volume": 20,
}

MOVIES_DIR = "/home/deck/.local/share/Steam/steamui/movies"
SOUNDS_DIR = "/home/deck/.local/share/Steam/steamui/sounds"
STARTUP_FILES = [
    os.path.join(MOVIES_DIR, "deck_startup.webm"),
    os.path.join(MOVIES_DIR, "oled_startup.webm"),
    os.path.join(MOVIES_DIR, "steam_os_startup.webm"),
    os.path.join(MOVIES_DIR, "steam_os_family_startup.webm"),
    os.path.join(MOVIES_DIR, "bigpicture_startup.webm"),
    os.path.join(MOVIES_DIR, "startup_machine.webm"),
    os.path.join(MOVIES_DIR, "steamframe_startup_450x450.webm"),
    os.path.join(SOUNDS_DIR, "steam_os_startup.wav"),
]
# Community startup movies (points shop) are cached elsewhere and "shuffle"
# can pick any of them, so they must be measured too or the duck is too short.
COMMUNITY_MOVIES_DIR = "/home/deck/.local/share/Steam/config/communityitemscache/startupmovies"
UIOVERRIDES_MOVIES_DIR = "/home/deck/.local/share/Steam/config/uioverrides/movies"

DEFAULT_DUCK_SECONDS = 6.0
# The duck starts a little before the Steam UI is up and the animation only
# begins once that window exists, so leave slack for that offset.
DUCK_BUFFER = 4.0


def candidate_startup_files():
    """System startup movies plus any community/uioverrides movie Steam may play."""
    files = list(STARTUP_FILES)
    for d in (COMMUNITY_MOVIES_DIR, UIOVERRIDES_MOVIES_DIR):
        try:
            if not os.path.isdir(d):
                continue
            for name in sorted(os.listdir(d)):
                if name.lower().endswith((".webm", ".mp4")):
                    files.append(os.path.join(d, name))
        except Exception as e:
            decky.logger.warning(f"scan {d}: {e}")
    return files


def load_settings():
    try:
        with open(SETTINGS_PATH, "r") as f:
            settings = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        settings = {}
    merged = dict(DEFAULT_SETTINGS)
    merged.update(settings)
    return merged


def save_settings(settings):
    os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f)


async def _run_as_deck(name, *args):
    xdg_runtime = f"/run/user/{_deck_uid}"
    proc = await asyncio.create_subprocess_exec(
        "sudo", "-u", _deck_user, "env",
        f"XDG_RUNTIME_DIR={xdg_runtime}",
        f"HOME=/home/deck",
        name, *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        detail = stderr.decode().strip() if stderr else f"exit {proc.returncode}"
        raise RuntimeError(f"{name} {' '.join(map(str, args))} failed: {detail}")
    return stdout.decode()


async def _ffprobe_duration(path):
    out = await _run_as_deck(
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0", path,
    )
    out = out.strip()
    if not out or out.lower() == "n/a":
        raise RuntimeError(f"no duration: {path}")
    return float(out)


async def detect_anim_duration():
    details = {}
    max_dur = 0.0
    for path in candidate_startup_files():
        if not os.path.isfile(path):
            continue
        try:
            dur = await _ffprobe_duration(path)
            details[os.path.basename(path)] = round(dur, 3)
            max_dur = max(max_dur, dur)
        except Exception as e:
            decky.logger.warning(f"ffprobe {path}: {e}")
    if max_dur <= 0:
        return DEFAULT_DUCK_SECONDS, details, False
    return max_dur + DUCK_BUFFER, details, True


def steamui_pid():
    """PID of the main Steam UI (steamwebhelper) process, or None if it is down."""
    try:
        entries = os.listdir("/proc")
    except Exception:
        return None
    for entry in entries:
        if not entry.isdigit():
            continue
        try:
            with open("/proc/" + entry + "/comm") as f:
                if "steamwebhelper" not in f.read():
                    continue
            with open("/proc/" + entry + "/cmdline", "rb") as f:
                cmd = f.read().decode("utf-8", "replace")
        except Exception:
            continue
        if "-startcount=" in cmd:
            return int(entry)
    return None


async def _wpctl(*args):
    return await _run_as_deck("wpctl", *args)


async def list_hw_sinks():
    """Return [(id, description)] for real hardware sinks (not loopback)."""
    out = await _wpctl("status", "-n")
    sinks = []
    in_audio = False
    in_sinks = False
    for raw in out.splitlines():
        line = raw.strip("│ \t")
        if line.startswith("Audio"):
            in_audio = True
            continue
        if line.startswith("Video") or line.startswith("Settings"):
            in_audio = False
            in_sinks = False
            continue
        if not in_audio:
            continue
        if "Sinks:" in line:
            in_sinks = True
            continue
        if any(k in line for k in ("Devices:", "Sources:", "Filters:", "Streams:")):
            in_sinks = False
            continue
        if not in_sinks:
            continue
        m = re.match(r"\*?\s*(\d+)\.\s+(\S+)", line)
        if not m:
            continue
        sink_id = int(m.group(1))
        name = m.group(2)
        if "loopback" in name.lower() or "filter" in name.lower():
            continue
        sinks.append((sink_id, name))
    return sinks


async def get_hw_volume(sink_id):
    out = await _wpctl("get-volume", str(sink_id))
    m = re.search(r"Volume:\s*([0-9.]+)", out)
    if not m:
        raise RuntimeError(f"cannot parse wpctl volume: {out!r}")
    return int(round(float(m.group(1)) * 100))


async def set_hw_volume(sink_id, volume):
    volume = max(0, min(100, int(round(float(volume)))))
    ratio = volume / 100.0
    await _wpctl("set-volume", str(sink_id), f"{ratio:.3f}")
    # unmute if supported
    try:
        await _wpctl("set-mute", str(sink_id), "0")
    except Exception:
        pass


async def get_all_hw_volumes():
    result = {}
    for sink_id, desc in await list_hw_sinks():
        try:
            result[str(sink_id)] = {
                "desc": desc,
                "volume": await get_hw_volume(sink_id),
            }
        except Exception as e:
            decky.logger.error(f"get hw volume {sink_id}: {e}")
    return result


async def set_all_hw_volumes(volume):
    sinks = await list_hw_sinks()
    for sink_id, _ in sinks:
        await set_hw_volume(sink_id, volume)
    return [str(i) for i, _ in sinks]


class Plugin:
    _duck_task = None
    _watch_task = None
    _anim_duration = DEFAULT_DUCK_SECONDS

    async def get_settings(self):
        settings = load_settings()
        volumes = {}
        try:
            volumes = await get_all_hw_volumes()
        except Exception as e:
            decky.logger.error(f"get volumes failed: {e}")

        current = None
        for info in volumes.values():
            if "hdmi" not in info["desc"].lower():
                current = info["volume"]
                break
        if current is None and volumes:
            current = next(iter(volumes.values()))["volume"]

        return {
            "enabled": settings.get("enabled", True),
            "anim_volume": settings.get("anim_volume", 20),
            "current_volume": current,
            "sinks": {k: v["volume"] for k, v in volumes.items()},
            "auto_seconds": self._anim_duration,
        }

    async def set_enabled(self, enabled):
        settings = load_settings()
        settings["enabled"] = bool(enabled)
        save_settings(settings)
        decky.logger.info(f"enabled: {enabled}")

    async def set_anim_volume(self, volume):
        volume = max(0, min(100, int(round(float(volume)))))
        settings = load_settings()
        settings["anim_volume"] = volume
        save_settings(settings)
        decky.logger.info(f"anim_volume: {volume}")
        return volume

    async def preview_duck(self):
        settings = load_settings()
        if not settings.get("enabled", True):
            return {"skipped": "disabled"}
        if self._duck_task and not self._duck_task.done():
            return {"skipped": "already_running"}
        self._duck_task = asyncio.get_event_loop().create_task(
            self._duck_worker("preview", play_audio=True)
        )
        return {"started": True, "reason": "preview"}

    async def _start_duck(self, reason="boot"):
        settings = load_settings()
        if not settings.get("enabled", True):
            decky.logger.info(f"duck skipped ({reason}): disabled")
            return {"skipped": "disabled"}
        if self._duck_task and not self._duck_task.done():
            decky.logger.info(f"duck already running ({reason})")
            return {"skipped": "already_running"}
        self._duck_task = asyncio.get_event_loop().create_task(
            self._duck_worker(reason, play_audio=False)
        )
        return {"started": True, "reason": reason}

    async def _play_boot_sound(self):
        """Play quietly via default sink only — no loud A/B."""
        src = os.path.join(SOUNDS_DIR, "steam_os_startup.wav")
        if not os.path.isfile(src):
            decky.logger.warning("preview: boot sound missing")
            return
        await _run_as_deck(
            "paplay", "--volume=65536", src,
        )
        decky.logger.info("preview: played boot sound on default sink")

    async def _duck_worker(self, reason, play_audio=False):
        settings = load_settings()
        target = max(0, min(100, int(settings.get("anim_volume", 20))))

        try:
            seconds, details, ok = await detect_anim_duration()
            self._anim_duration = seconds
            decky.logger.info(f"duration source: auto={seconds:.2f}s detected={ok}")
        except Exception as e:
            seconds = DEFAULT_DUCK_SECONDS
            decky.logger.warning(f"duration detect failed, fallback {seconds}s: {e}")

        try:
            saved_map = await get_all_hw_volumes()
        except Exception as e:
            decky.logger.error(f"duck: cannot read volumes: {e}")
            return

        if not saved_map:
            decky.logger.error("duck: no hardware sinks found")
            return

        summary = ", ".join(
            f"{v['desc']}={v['volume']}%" for v in saved_map.values()
        )
        decky.logger.info(
            f"duck start ({reason}): {summary} -> {target}% for {seconds:.2f}s"
        )

        try:
            sink_ids = await set_all_hw_volumes(target)

            if play_audio:
                await self._play_boot_sound()
                await asyncio.sleep(0.3)
            else:
                await asyncio.sleep(seconds)

            for sink_id, info in saved_map.items():
                now = await get_hw_volume(sink_id)
                if now == target:
                    await set_hw_volume(sink_id, info["volume"])
                else:
                    decky.logger.info(
                        f"duck end ({reason}): sink {sink_id} now {now}%, not restoring "
                        f"(was {info['volume']}%)"
                    )
            decky.logger.info(f"duck end ({reason}): restored prior volumes")
        except Exception as e:
            decky.logger.error(f"duck failed ({reason}): {e}")

    async def _main(self):
        decky.logger.info("BootVolume loaded")
        try:
            seconds, details, ok = await detect_anim_duration()
            self._anim_duration = seconds
            decky.logger.info(
                f"anim duration auto: {seconds:.2f}s ok={ok} files={details}"
            )
        except Exception as e:
            decky.logger.error(f"duration refresh failed: {e}")
        try:
            await self._start_duck(reason="boot")
        except Exception as e:
            decky.logger.error(f"boot duck failed: {e}")
        try:
            if self._watch_task is None or self._watch_task.done():
                self._watch_task = asyncio.get_event_loop().create_task(
                    self._watch_steamui()
                )
        except Exception as e:
            decky.logger.error(f"steam ui watch failed to start: {e}")

    async def _unload(self):
        if self._duck_task and not self._duck_task.done():
            self._duck_task.cancel()
        if self._watch_task and not self._watch_task.done():
            self._watch_task.cancel()
        decky.logger.info("BootVolume unloaded")

    async def _watch_steamui(self):
        """Duck again whenever the Steam UI restarts (e.g. "Restart Steam").

        The loader-based boot duck only fires when Decky itself restarts, which
        "Restart Steam" often does not do, so watch the UI process instead.
        """
        last_pid = None
        last_duck = 0.0
        loop = asyncio.get_event_loop()
        while True:
            try:
                pid = steamui_pid()
                if pid is not None and pid != last_pid:
                    if last_pid is None:
                        decky.logger.info(f"steam ui watch: tracking pid {pid}")
                    else:
                        now = loop.time()
                        if now - last_duck >= 10.0:
                            decky.logger.info(
                                f"steam ui restarted (pid {last_pid} -> {pid}); ducking"
                            )
                            last_duck = now
                            await self._start_duck(reason="steamui")
                    last_pid = pid
            except asyncio.CancelledError:
                raise
            except Exception as e:
                decky.logger.warning(f"steam ui watch: {e}")
            await asyncio.sleep(1.0)
