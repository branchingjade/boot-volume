# BootVolume

**English** · [简体中文](README.md)

A [Decky Loader](https://decky.xyz) plugin for SteamOS that **temporarily lowers the system volume
while the Steam boot animation plays**, then restores the volume you had before.

The SteamOS startup movie can be surprisingly loud — especially the community startup movies from
the Points Shop. This plugin ducks every audio output for the length of the animation and puts the
previous values back afterwards. It does not modify any Steam or system files.

## Features

- Ducks **all** audio outputs, including the current default output (HDMI / TV, USB DAC, headset, …)
- Measures the animation length from the startup movies actually installed on the machine,
  including community startup movies from the Points Shop (`config/communityitemscache/startupmovies`)
- Triggers on boot, on *Restart Steam*, **and on the first startup movie after a resume from sleep**
- Restores exactly the volumes that were set before — and never overwrites a change you made yourself
  during the duck window
- **Bilingual panel** (Chinese / English) with Chinese as the default, switchable in the panel and
  remembered locally
- QAM panel with an enable toggle, target volume slider and a preview button
- No background services, no system file patching, nothing persistent besides a small settings file

## Interface language

The dropdown at the bottom of the panel offers **中文** (default) and **English**; the choice is
stored locally.

## How it works

1. The backend enumerates the PipeWire sinks (`wpctl status`) and reads their volumes.
2. On boot, and whenever the Steam UI process restarts, it sets every sink to the configured target
   volume and holds it for the measured animation length + a safety margin.
3. While the duck is running it re-checks the sink list once per second, so devices that only appear
   mid-window (USB / HDMI sinks re-enumerated after a resume) are ducked as well.
4. Afterwards each sink is restored to the volume it had before the duck. If you changed a volume
   yourself in that window, that sink is left alone.

The animation length is probed with `ffprobe` over the startup movies in
`steamui/movies`, `config/communityitemscache/startupmovies` and `config/uioverrides/movies`.
The longest movie found is used, so a shuffled community movie never gets cut off.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| Enable | on | Duck the volume while the animation plays |
| Volume during the animation | 20% | Target volume for every output; `0` = effectively silent |
| Animation length | auto | Read-only; measured from the movies on disk (longest + margin) |

## Install

- **Plugin store**: once the plugin is listed, search for *BootVolume* in the Decky store.
- **Manual**: download `BootVolume.zip` from the latest release and use *Developer → Install Plugin
  from file* in the Decky settings, or unzip it into `~/homebrew/plugins/`.

## Build from source

```bash
pnpm install
pnpm run build      # produces dist/index.js
```

The plugin folder that Decky loads needs `plugin.json`, `main.py` and `dist/`.

## Troubleshooting

- **Nothing is ducked**: check `~/homebrew/logs/BootVolume/*.log`. The backend logs the sinks it
  found, the measured animation length and the target volume for every duck.
- **The tail of a very long custom movie is loud**: the length is measured from the files on disk;
  if you sideload a movie somewhere unusual, the measurement falls back to the system movies.
- **A `main.py` change does nothing**: Decky does not hot-reload this plugin (the loader logs
  `has requested to not be re-loaded`). Toggle the plugin off and on again in the Decky panel, or
  restart Decky.

## Changelog

### 1.4.0

- **New: the first startup movie after a resume from sleep is ducked.** The plugin used to trigger
  only on Decky's own load and on a `steamwebhelper` pid change, but the movie played right after a
  resume comes from the *same* Steam UI process (the pid does not change), so nothing fired — hence
  "the first boot animation after a long sleep is loud, the second and third are fine". The resume is
  now detected by the jump in `time.time() - time.monotonic()`, and the duck starts immediately.
- **New: bilingual panel** (Chinese default, switchable and remembered); the panel is no longer
  single-language.
- **Improved: no `ffprobe` on the hot path.** The duck no longer rescans all 17 movie files before it
  starts — it uses the duration measured at load time, so the first seconds of the animation are
  covered.
- **Fixed: sinks that appear after a resume were missed.** The sink list is now re-checked once per
  second during the duck, so newly enumerated outputs (back at full volume) are ducked too and are
  restored correctly afterwards.
- **Fixed: giving up when the audio graph is not ready.** It now retries briefly instead of logging
  `no hardware sinks found` and returning.

### 1.3.0

- **Fix: the default audio output was never ducked.** `wpctl status` marks the current default sink
  with a leading `*`, which the sink parser did not accept, so the plugin skipped exactly the output
  the animation plays on (and the preview button did nothing audible). The parser now handles the
  marker, so HDMI / TV and any other default output is ducked too.
- **Fix: the panel reported the wrong "current output".** It used to show the first non-HDMI sink,
  which is not necessarily the one you are listening on. It now shows the actual default output and
  its volume (with the device name).
- **Fix: community startup movies were not measured.** Only the built-in `steamui/movies` files were
  probed, so a Points Shop movie longer than the built-in ones (e.g. a 10 s movie against a 9.55 s
  window) had its ending play at full volume. The community cache and `uioverrides` directories are
  now scanned, and the safety margin was raised to 4 s.
- **New: ducking on *Restart Steam*.** The duck used to be tied to Decky's own loader start, which
  "Restart Steam" often does not trigger (or triggers 40 s too late). A small watcher now notices the
  Steam UI process being replaced and ducks immediately.

### 1.2.0

- Auto-detect the animation length from the startup movies
- Preview button, QAM panel

## Credits

- Inspired by, and the backend layout derived from, MuteOnSleep.
- Based on the [Decky plugin template](https://github.com/SteamDeckHomebrew/decky-plugin-template).

## License

BSD-3-Clause. See [LICENSE](LICENSE).
