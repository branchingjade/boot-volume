# BootVolume

A [Decky Loader](https://decky.xyz) plugin for SteamOS that **temporarily lowers the system volume
while the Steam boot animation plays**, then restores the volume you had before.

The SteamOS startup movie can be surprisingly loud — especially the community startup movies from
the Points Shop. This plugin ducks every audio output for the length of the animation and puts the
previous values back afterwards. It does not modify any Steam or system files.

## Features

- Ducks **all** audio outputs, including the current default output (HDMI / TV, USB DAC, headset, …)
- Measures the animation length from the startup movies actually installed on the machine,
  including community startup movies from the Points Shop (`config/communityitemscache/startupmovies`)
- Triggers both on boot **and** when you use *Restart Steam* in the middle of a session
- Restores exactly the volumes that were set before — and never overwrites a change you made yourself
  during the duck window
- QAM panel with an enable toggle, target volume slider and a preview button
- No background services, no system file patching, nothing persistent besides a small settings file

## How it works

1. The backend enumerates the PipeWire sinks (`wpctl status`) and reads their volumes.
2. On boot, and whenever the Steam UI process restarts, it sets every sink to the configured target
   volume and holds it for the measured animation length + a safety margin.
3. Afterwards each sink is restored to the volume it had before the duck. If you changed a volume
   yourself in that window, that sink is left alone.

The animation length is probed with `ffprobe` over the startup movies in
`steamui/movies`, `config/communityitemscache/startupmovies` and `config/uioverrides/movies`.
The longest movie found is used, so a shuffled community movie never gets cut off.

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| Enable | on | Duck the volume while the animation plays |
| Volume during the animation | 25% | Target volume for every output; `0` = effectively silent |
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

## Changelog

### 1.3.0

- **Fix: the default audio output was never ducked.** `wpctl status` marks the current default sink
  with a leading `*`, which the sink parser did not accept, so the plugin skipped exactly the output
  the animation plays on (and the preview button did nothing audible). The parser now handles the
  marker, so HDMI / TV and any other default output is ducked too.
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

- Inspired by, and the backend layout derived from, [MuteOnSleep](https://github.com/genc-v/mute-on-sleep).
- Based on the [Decky plugin template](https://github.com/SteamDeckHomebrew/decky-plugin-template).

## License

BSD-3-Clause. See [LICENSE](LICENSE).
