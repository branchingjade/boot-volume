const manifest = {"name":"BootVolume"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const call = api.call;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaVolumeDown (props) {
  return GenIcon({"attr":{"viewBox":"0 0 384 512"},"child":[{"tag":"path","attr":{"d":"M215.03 72.04L126.06 161H24c-13.26 0-24 10.74-24 24v144c0 13.25 10.74 24 24 24h102.06l88.97 88.95c15.03 15.03 40.97 4.47 40.97-16.97V89.02c0-21.47-25.96-31.98-40.97-16.98zm123.2 108.08c-11.58-6.33-26.19-2.16-32.61 9.45-6.39 11.61-2.16 26.2 9.45 32.61C327.98 229.28 336 242.62 336 257c0 14.38-8.02 27.72-20.92 34.81-11.61 6.41-15.84 21-9.45 32.61 6.43 11.66 21.05 15.8 32.61 9.45 28.23-15.55 45.77-45 45.77-76.88s-17.54-61.32-45.78-76.87z"},"child":[]}]})(props);
}

function BootVolumePanel() {
    const [enabled, setEnabled] = SP_REACT.useState(true);
    const [animVolume, setAnimVolume] = SP_REACT.useState(20);
    const [currentVolume, setCurrentVolume] = SP_REACT.useState(null);
    const [currentSink, setCurrentSink] = SP_REACT.useState(null);
    const [autoSeconds, setAutoSeconds] = SP_REACT.useState(6);
    const [previewing, setPreviewing] = SP_REACT.useState(false);
    const [error, setError] = SP_REACT.useState(null);
    const saveTimer = SP_REACT.useRef(null);
    const refresh = () => call("get_settings")
        .then((s) => {
        setError(null);
        setEnabled(s.enabled);
        setAnimVolume(s.anim_volume);
        setCurrentVolume(s.current_volume);
        setCurrentSink(s.current_sink ?? null);
        setAutoSeconds(s.auto_seconds ?? 6);
    })
        .catch((e) => setError(String(e)));
    SP_REACT.useEffect(() => {
        refresh();
        return () => {
            if (saveTimer.current)
                window.clearTimeout(saveTimer.current);
        };
    }, []);
    const onAnimVolume = (value) => {
        const next = Math.round(value);
        setAnimVolume(next);
        if (saveTimer.current)
            window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
            call("set_anim_volume", next).catch((e) => setError(String(e)));
        }, 200);
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Boot animation volume", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: "Enable", description: "Lower the system volume while Steam starts, then put it back. No system files are touched.", checked: enabled, onChange: (val) => {
                        setEnabled(val);
                        call("set_enabled", val).catch((e) => setError(String(e)));
                    } }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.SliderField, { label: `Volume during the animation: ${animVolume}%`, description: `Current output: ${currentSink ?? "unknown"} — ${currentVolume == null ? "?" : currentVolume + "%"}. It is set to the value above while the animation plays, then restored.`, value: animVolume, min: 0, max: 100, step: 1, disabled: !enabled, onChange: onAnimVolume }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }, children: `Animation length measured from the startup movies on disk: ${autoSeconds.toFixed(1)}s (includes a safety margin).` }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: !enabled || previewing, onClick: () => {
                        if (!enabled || previewing)
                            return;
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
                    }, children: previewing ? "Playing the startup sound…" : "Preview the duck" }) }), error && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.75rem", color: "#ff8a8a", padding: "0 16px" }, children: error }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: "0.75rem", opacity: 0.7, padding: "0 16px" }, children: "How it works: every audio output is temporarily set to the target volume, held for the measured animation length, then restored to the value it had before." }) })] }));
}
var index = definePlugin(() => ({
    name: "BootVolume",
    content: SP_JSX.jsx(BootVolumePanel, {}),
    icon: SP_JSX.jsx(FaVolumeDown, {}),
    onDismount() { },
}));

export { index as default };
//# sourceMappingURL=index.js.map
