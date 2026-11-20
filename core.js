/* Shared logic for the link page builder, the public profile page and the server */

const MAX_LINKS = 30;

/* Profile photos: either an image link, or a small photo uploaded in the builder
   (shrunk in the browser and stored as a data: address). Only these image types are
   accepted. SVG is left out on purpose because it can carry scripts. */
const MAX_AVATAR_DATA = 60000;
const DATA_IMAGE = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function isDataImage(value) {
    return typeof value === "string" && value.length <= MAX_AVATAR_DATA && DATA_IMAGE.test(value);
}

function cleanAvatar(value) {
    if (typeof value !== "string") return "";
    if (value.startsWith("data:")) return isDataImage(value) ? value : "";
    const link = value.trim().slice(0, 500);
    return safeUrl(link) ? link : ""; // only real http(s) addresses are kept
}

/* The address to show for a profile photo, or null if it isn't safe */
function safeAvatar(value) {
    return isDataImage(value) ? value : safeUrl(value);
}
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/* ---------- Looks ---------- */
/* tone: light | dark | colour (used by the filter in the builder)
   card: solid | glass | shadow | outline | hard | glow
   radius: corner size of link buttons in px
   bgSize / solid: only for patterned backgrounds
   font: sans | serif | mono | round | hand
   icons: brand (coloured badges) | mono (badges use the text colour) */

const THEME_LIST = [
    { id: "light", tone: "light",    name: "Light",    bg: "#f2f3f1", card: "#ffffff", text: "#15181a", muted: "#62696d", line: "#d9dcd9", avatar: "#3a47f0", avatarInk: "#ffffff", card_style: "solid",   radius: 14,  font: "sans",  icons: "brand" },
    { id: "ink", tone: "dark",      name: "Dark",     bg: "#101214", card: "#1d2125", text: "#eceeef", muted: "#9aa1a6", line: "#2e3438", avatar: "#eceeef", avatarInk: "#101214", card_style: "solid",   radius: 14,  font: "sans",  icons: "brand" },
    { id: "indigo", tone: "colour",   name: "Indigo",   bg: "#3a47f0", card: "rgba(255,255,255,0.14)", text: "#ffffff", muted: "rgba(255,255,255,0.8)", line: "rgba(255,255,255,0.3)", avatar: "#ffffff", avatarInk: "#3a47f0", card_style: "glass", radius: 14, font: "sans", icons: "brand" },
    { id: "sunset", tone: "colour",   name: "Sunset",   bg: "linear-gradient(160deg,#ff9a56 0%,#ff5e7e 55%,#b44bd4 100%)", card: "rgba(255,255,255,0.2)", text: "#ffffff", muted: "rgba(255,255,255,0.88)", line: "rgba(255,255,255,0.4)", avatar: "#ffffff", avatarInk: "#ff5e7e", card_style: "glass", radius: 999, font: "round", icons: "brand" },
    { id: "ocean", tone: "colour",    name: "Ocean",    bg: "linear-gradient(180deg,#0f4c81 0%,#1aa6b7 100%)", card: "rgba(255,255,255,0.16)", text: "#ffffff", muted: "rgba(255,255,255,0.85)", line: "rgba(255,255,255,0.32)", avatar: "#ffffff", avatarInk: "#0f4c81", card_style: "glass", radius: 18, font: "sans", icons: "brand" },
    { id: "aurora", tone: "colour",   name: "Aurora",   bg: "linear-gradient(135deg,#00c9a7 0%,#845ec2 60%,#2c73d2 100%)", card: "rgba(255,255,255,0.18)", text: "#ffffff", muted: "rgba(255,255,255,0.86)", line: "rgba(255,255,255,0.38)", avatar: "#ffffff", avatarInk: "#845ec2", card_style: "glass", radius: 16, font: "sans", icons: "brand" },
    { id: "berry", tone: "colour",    name: "Berry",    bg: "linear-gradient(160deg,#4a1d6b 0%,#c2185b 100%)", card: "rgba(255,255,255,0.14)", text: "#ffffff", muted: "rgba(255,255,255,0.82)", line: "rgba(255,255,255,0.3)", avatar: "#ffffff", avatarInk: "#c2185b", card_style: "glass", radius: 999, font: "sans", icons: "brand" },
    { id: "midnight", tone: "dark", name: "Midnight", bg: "linear-gradient(180deg,#0b1026 0%,#1b2559 100%)", card: "rgba(255,255,255,0.08)", text: "#e9ecff", muted: "#9aa4d6", line: "rgba(255,255,255,0.16)", avatar: "#8fa2ff", avatarInk: "#0b1026", card_style: "glass", radius: 14, font: "sans", icons: "brand" },
    { id: "forest", tone: "dark",   name: "Forest",   bg: "#14281d", card: "#1e3a2b", text: "#e8f3ea", muted: "#9db8a5", line: "#2f5440", avatar: "#8fd19e", avatarInk: "#14281d", card_style: "solid", radius: 16, font: "round", icons: "brand" },
    { id: "peach", tone: "light",    name: "Peach",    bg: "#ffe3d3", card: "#fff7f2", text: "#4a2a1f", muted: "#8a6355", line: "#f2bfa6", avatar: "#ff7a4d", avatarInk: "#ffffff", card_style: "shadow", radius: 22, font: "round", icons: "brand" },
    { id: "mint", tone: "light",     name: "Mint",     bg: "#d9f5e8", card: "#ffffff", text: "#12372a", muted: "#4f7a69", line: "#b3e3cd", avatar: "#1f9d6b", avatarInk: "#ffffff", card_style: "shadow", radius: 999, font: "sans", icons: "brand" },
    { id: "lavender", tone: "light", name: "Lavender", bg: "#e9e3ff", card: "#ffffff", text: "#2b2155", muted: "#6f68a0", line: "#cfc5f5", avatar: "#6b4fe0", avatarInk: "#ffffff", card_style: "shadow", radius: 22, font: "sans", icons: "brand" },
    { id: "candy", tone: "light",    name: "Candy",    bg: "#ffd6e8", card: "#ffffff", text: "#5a1033", muted: "#a05577", line: "#ffb3d3", avatar: "#ff4d9a", avatarInk: "#ffffff", card_style: "solid", radius: 999, font: "round", icons: "brand" },
    { id: "mono", tone: "light",     name: "Mono",     bg: "#e6e6e6", card: "#ffffff", text: "#111111", muted: "#555555", line: "#cfcfcf", avatar: "#111111", avatarInk: "#ffffff", card_style: "solid", radius: 10, font: "sans", icons: "mono" },
    { id: "paper", tone: "light",    name: "Paper",    bg: "#f4efe6", card: "transparent", text: "#2a2118", muted: "#6e6254", line: "#2a2118", avatar: "#2a2118", avatarInk: "#f4efe6", card_style: "outline", radius: 0, font: "serif", icons: "mono" },
    { id: "brutal", tone: "colour",   name: "Bold",     bg: "#ffe14d", card: "#ffffff", text: "#111111", muted: "#2b2b2b", line: "#111111", avatar: "#111111", avatarInk: "#ffe14d", card_style: "hard", radius: 0, font: "sans", icons: "mono" },
    { id: "neon", tone: "dark",     name: "Neon",     bg: "#0a0a12", card: "#12121f", text: "#e8fbff", muted: "#7fb5c2", line: "#00e5ff", avatar: "#00e5ff", avatarInk: "#0a0a12", card_style: "glow", radius: 12, font: "mono", icons: "mono" },
    { id: "terminal", tone: "dark", name: "Terminal", bg: "#050a05", card: "transparent", text: "#39ff6a", muted: "#2fb552", line: "#39ff6a", avatar: "#39ff6a", avatarInk: "#050a05", card_style: "outline", radius: 0, font: "mono", icons: "mono" },

    /* ---- More looks ---- */
    { id: "sky",       tone: "light",  name: "Sky",       bg: "linear-gradient(180deg,#e3f3ff 0%,#fdfeff 100%)", card: "#ffffff", text: "#0b2a4a", muted: "#5b7690", line: "#cfe4f7", avatar: "#1e88e5", avatarInk: "#ffffff", card_style: "shadow", radius: 18, font: "sans", icons: "brand" },
    { id: "rose",      tone: "light",  name: "Rose",      bg: "#ffe4ea", card: "#fff8fa", text: "#5c1a2b", muted: "#a2586b", line: "#f7bccb", avatar: "#e11d48", avatarInk: "#ffffff", card_style: "solid", radius: 16, font: "serif", icons: "brand" },
    { id: "lemon",     tone: "light",  name: "Lemon",     bg: "#fff8c5", solid: "#fff8c5", card: "#ffffff", text: "#3a3300", muted: "#7a6f1f", line: "#ecdc6a", avatar: "#3a3300", avatarInk: "#fff8c5", card_style: "solid", radius: 14, font: "round", icons: "mono" },
    { id: "matcha",    tone: "light",  name: "Matcha",    bg: "#e6efd8", card: "#f7fbf0", text: "#2f3e1f", muted: "#68794f", line: "#c6d6a8", avatar: "#5b7f2a", avatarInk: "#ffffff", card_style: "shadow", radius: 16, font: "round", icons: "brand" },
    { id: "cotton",    tone: "light",  name: "Cotton",    bg: "linear-gradient(135deg,#ffd1dc 0%,#cfe6ff 50%,#d6ffe4 100%)", card: "rgba(255,255,255,0.7)", text: "#2b2b3a", muted: "#6a6a80", line: "rgba(255,255,255,0.9)", avatar: "#ffffff", avatarInk: "#7a5cff", card_style: "glass", radius: 22, font: "round", icons: "brand" },
    { id: "sunrise",   tone: "light",  name: "Sunrise",   bg: "linear-gradient(180deg,#ffd194 0%,#9fe6f2 100%)", card: "rgba(255,255,255,0.6)", text: "#1d2b3a", muted: "#41566b", line: "rgba(255,255,255,0.85)", avatar: "#ff8a3d", avatarInk: "#ffffff", card_style: "glass", radius: 16, font: "sans", icons: "brand" },
    { id: "ice",       tone: "light",  name: "Ice",       bg: "linear-gradient(160deg,#eaf6ff 0%,#c8e3fb 100%)", card: "rgba(255,255,255,0.65)", text: "#12324d", muted: "#46657f", line: "rgba(255,255,255,0.95)", avatar: "#3b82c4", avatarInk: "#ffffff", card_style: "glass", radius: 14, font: "sans", icons: "brand" },
    { id: "polka",     tone: "light",  name: "Polka",     bg: "radial-gradient(#e6c97a 1.6px, transparent 1.8px), #fff7e0", bgSize: "20px 20px", solid: "#fff7e0", card: "#ffffff", text: "#4a3a10", muted: "#8a7433", line: "#e6c97a", avatar: "#e6a817", avatarInk: "#ffffff", card_style: "solid", radius: 14, font: "round", icons: "brand" },
    { id: "notebook",  tone: "light",  name: "Notebook",  bg: "repeating-linear-gradient(180deg, transparent 0, transparent 31px, #cfe1f3 31px, #cfe1f3 32px), #fffef8", solid: "#fffef8", card: "#ffffff", text: "#1f2a44", muted: "#5d6b88", line: "#1f2a44", avatar: "#1f2a44", avatarInk: "#fffef8", card_style: "solid", radius: 6, font: "hand", icons: "mono" },
    { id: "blueprint", tone: "colour", name: "Blueprint", bg: "linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px), #0b3d91", bgSize: "26px 26px", solid: "#0b3d91", card: "rgba(255,255,255,0.08)", text: "#ffffff", muted: "#b8cdf5", line: "rgba(255,255,255,0.55)", avatar: "#ffffff", avatarInk: "#0b3d91", card_style: "outline", radius: 2, font: "mono", icons: "mono" },
    { id: "dusk",      tone: "colour", name: "Dusk",      bg: "linear-gradient(180deg,#2c3e50 0%,#fd746c 100%)", card: "rgba(255,255,255,0.16)", text: "#ffffff", muted: "rgba(255,255,255,0.85)", line: "rgba(255,255,255,0.35)", avatar: "#ffffff", avatarInk: "#2c3e50", card_style: "glass", radius: 18, font: "sans", icons: "brand" },
    { id: "cherry",    tone: "colour", name: "Cherry",    bg: "#7a0019", card: "rgba(255,255,255,0.1)", text: "#ffffff", muted: "rgba(255,255,255,0.8)", line: "rgba(255,255,255,0.28)", avatar: "#ffffff", avatarInk: "#7a0019", card_style: "glass", radius: 999, font: "round", icons: "brand" },
    { id: "coffee",    tone: "dark",   name: "Coffee",    bg: "#2b1d14", card: "#3a2a1e", text: "#f3e6d8", muted: "#bfa58c", line: "#5a4331", avatar: "#d9b48a", avatarInk: "#2b1d14", card_style: "solid", radius: 12, font: "serif", icons: "mono" },
    { id: "graphite",  tone: "dark",   name: "Graphite",  bg: "#1b1b1f", card: "#26262c", text: "#ffffff", muted: "#a0a0ab", line: "#3a3a42", avatar: "#ffffff", avatarInk: "#1b1b1f", card_style: "solid", radius: 10, font: "sans", icons: "brand" },
    { id: "gold",      tone: "dark",   name: "Gold",      bg: "#0e0e0e", card: "transparent", text: "#f5e6c0", muted: "#b9a574", line: "#c9a24b", avatar: "#c9a24b", avatarInk: "#0e0e0e", card_style: "outline", radius: 4, font: "serif", icons: "mono" },
    { id: "galaxy",    tone: "dark",   name: "Galaxy",    bg: "radial-gradient(circle at 20% 10%, rgba(139,92,246,0.55) 0%, transparent 45%), radial-gradient(circle at 85% 90%, rgba(37,99,235,0.5) 0%, transparent 45%), #0b0b1f", solid: "#0b0b1f", card: "rgba(255,255,255,0.07)", text: "#f1ecff", muted: "#a99fd6", line: "#8b5cf6", avatar: "#c4b5fd", avatarInk: "#0b0b1f", card_style: "glow", radius: 16, font: "sans", icons: "brand" },
    { id: "arcade",    tone: "dark",   name: "Arcade",    bg: "#1a0b2e", card: "#2a1250", text: "#ffffff", muted: "#c9a8ff", line: "#ff2e97", avatar: "#00f0ff", avatarInk: "#1a0b2e", card_style: "hard", radius: 0, font: "mono", icons: "mono" },
    { id: "ember",     tone: "dark",   name: "Ember",     bg: "linear-gradient(160deg,#1a0a00 0%,#7a2200 100%)", card: "rgba(255,140,0,0.12)", text: "#ffe7cf", muted: "#e0b48c", line: "rgba(255,150,60,0.45)", avatar: "#ff8a3d", avatarInk: "#1a0a00", card_style: "glass", radius: 14, font: "sans", icons: "brand" },
];

const THEMES = THEME_LIST.map((t) => t.id);

const FONTS = {
    sans:  `'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif`,
    serif: `'Fraunces', Georgia, 'Times New Roman', serif`,
    mono:  `'Space Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`,
    round: `'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif`,
    hand:  `'Caveat', 'Segoe Print', 'Bradley Hand', cursive`,
};

function getTheme(id) {
    return THEME_LIST.find((t) => t.id === id) || THEME_LIST[0];
}

/* Writes a look onto an element as CSS variables */
function applyTheme(el, id) {
    const t = getTheme(id);
    const s = el.style;
    s.setProperty("--p-bg", t.bg);
    s.setProperty("--p-bg-size", t.bgSize || "auto");
    s.setProperty("--p-bg-solid", t.solid || t.bg); // a plain colour, for icons drawn on top of the page colour
    s.setProperty("--p-card", t.card);
    s.setProperty("--p-text", t.text);
    s.setProperty("--p-muted", t.muted);
    s.setProperty("--p-line", t.line);
    s.setProperty("--p-avatar", t.avatar);
    s.setProperty("--p-avatar-ink", t.avatarInk);
    s.setProperty("--p-radius", t.radius + "px");
    s.setProperty("--p-badge-radius", t.radius === 0 ? "0" : t.radius >= 999 ? "50%" : "10px");
    s.setProperty("--p-avatar-radius", t.radius === 0 ? "0" : "50%");
    s.setProperty("--p-font", FONTS[t.font]);
    el.dataset.theme = t.id;
    el.dataset.card = t.card_style;
    el.dataset.font = t.font;
    el.dataset.icons = t.icons;
}

/* ---------- Platforms and icons ---------- */
/* Icons are 24x24. Most use the filled brand shape; Instagram and the
   generic ones are drawn with strokes. */

const ICON_PATHS = {
    instagram: `<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.25" fill="currentColor"/>`,
    x: `<path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>`,
    tiktok: `<path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>`,
    youtube: `<path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>`,
    linkedin: `<path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>`,
    github: `<path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>`,
    facebook: `<path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>`,
    whatsapp: `<path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>`,
    telegram: `<path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>`,
    email: `<rect x="2.8" y="5" width="18.4" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 7.2l8.5 6.3 8.5-6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    website: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
};

const INSTAGRAM_GRADIENT = "linear-gradient(45deg,#f9a03a 0%,#e1306c 50%,#7c3aed 100%)";

const PLATFORMS = {
    instagram: { name: "Instagram", color: INSTAGRAM_GRADIENT, kind: "handle", hint: "yourhandle", url: (h) => `https://instagram.com/${h}` },
    x:         { name: "X",         color: "#000000", kind: "handle", hint: "yourhandle", url: (h) => `https://x.com/${h}` },
    tiktok:    { name: "TikTok",    color: "#010101", kind: "handle", hint: "yourhandle", url: (h) => `https://www.tiktok.com/@${h}` },
    youtube:   { name: "YouTube",   color: "#ff0000", kind: "handle", hint: "yourchannel", url: (h) => `https://www.youtube.com/@${h}` },
    linkedin:  { name: "LinkedIn",  color: "#0a66c2", kind: "handle", hint: "your-name", url: (h) => `https://www.linkedin.com/in/${h}` },
    github:    { name: "GitHub",    color: "#24292f", kind: "handle", hint: "yourusername", url: (h) => `https://github.com/${h}` },
    facebook:  { name: "Facebook",  color: "#1877f2", kind: "handle", hint: "yourpage", url: (h) => `https://facebook.com/${h}` },
    telegram:  { name: "Telegram",  color: "#229ed9", kind: "handle", hint: "yourusername", url: (h) => `https://t.me/${h}` },
    whatsapp:  { name: "WhatsApp",  color: "#25d366", kind: "phone",  hint: "233501234567 (with country code)", url: (d) => `https://wa.me/${d}` },
    email:     { name: "Email",     color: "#5f6670", kind: "email",  hint: "you@example.com", url: (e) => `mailto:${e}` },
    website:   { name: "Website", color: "#3a47f0", kind: "url", hint: "https://example.com", url: (u) => u },
};

/* Returns an <svg> string. Only fixed strings from this file go in, never user input. */
function iconMarkup(key, size = 22) {
    const inner = ICON_PATHS[key] || ICON_PATHS.website;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/* ---------- Validation ---------- */

function safeUrl(value) {
    let v = String(value || "").trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try {
        const u = new URL(v);
        const okProtocol = u.protocol === "http:" || u.protocol === "https:";
        return okProtocol && u.hostname.includes(".") ? u.href : null;
    } catch {
        return null;
    }
}

/* Turns a saved link item into { href, label, sub, platform }, or null if it isn't valid */
function resolveLink(item) {
    const platform = PLATFORMS[item.p];
    if (!platform) return null;

    const raw = String(item.v || "").trim();
    const title = String(item.t || "").trim();
    if (!raw) return null;

    let href = null;
    let sub = "";

    if (platform.kind === "handle") {
        if (/^https?:\/\//i.test(raw)) {
            href = safeUrl(raw);
        } else {
            const handle = raw.replace(/^@/, "").replace(/\s/g, "");
            if (/^[\w.-]{1,60}$/.test(handle)) {
                href = platform.url(handle);
                sub = "@" + handle;
            }
        }
    } else if (platform.kind === "phone") {
        const digits = raw.replace(/\D/g, "");
        if (digits.length >= 7 && digits.length <= 15) {
            href = platform.url(digits);
            sub = "+" + digits;
        }
    } else if (platform.kind === "email") {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
            href = platform.url(raw);
            sub = raw;
        }
    } else {
        href = safeUrl(raw);
        if (href) sub = new URL(href).hostname.replace(/^www\./, "");
    }

    if (!href) return null;

    const label = title || (item.p === "website" ? sub : platform.name);
    return { href, label, sub: title || item.p !== "website" ? sub : "", platform: item.p };
}

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
}

/* ---------- Cleaning data (used by the browser and the server) ---------- */

/* Never trust incoming data: force every field to a safe type and size */
function cleanProfile(data) {
    if (!data || typeof data !== "object") return null;
    const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

    return {
        name: str(data.name, 60),
        slug: slugify(str(data.slug, 30)),
        bio: str(data.bio, 240),
        avatar: cleanAvatar(data.avatar),
        theme: THEMES.includes(data.theme) ? data.theme : "light",
        links: (Array.isArray(data.links) ? data.links : []).slice(0, MAX_LINKS).map((l) => ({
            p: PLATFORMS[l && l.p] ? l.p : "website",
            v: str(l && l.v, 300),
            t: str(l && l.t, 60),
        })),
    };
}

/* ---------- Long-link fallback (works without a server) ---------- */

function encodeProfile(profile) {
    const wire = [
        profile.name,
        profile.slug,
        profile.bio,
        isDataImage(profile.avatar) ? "" : profile.avatar, // an uploaded photo is too big for a link
        profile.theme,
        profile.links.map((l) => (l.t ? [l.p, l.v, l.t] : [l.p, l.v])),
    ];
    const json = JSON.stringify(wire);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeProfile(text) {
    try {
        let b64 = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const data = JSON.parse(decodeURIComponent(escape(atob(b64))));
        if (!Array.isArray(data)) return null;
        const [name, slug, bio, avatar, theme, links] = data;
        return cleanProfile({
            name, slug, bio, avatar, theme,
            links: (Array.isArray(links) ? links : []).map((l) => ({ p: l && l[0], v: l && l[1], t: l && l[2] })),
        });
    } catch {
        return null;
    }
}

function buildLongUrl(profile) {
    const url = new URL("profile.html", location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("u", profile.slug);
    return url.href + "#" + encodeProfile(profile);
}

/* ---------- Rendering (used by the preview and the public page) ---------- */

function renderProfile(root, profile, { placeholder = false } = {}) {
    root.innerHTML = "";
    applyTheme(root, profile.theme);

    const name = profile.name.trim() || (placeholder ? "Your name" : "");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const initial = (name || "?").charAt(0).toUpperCase();
    const imgUrl = safeAvatar(profile.avatar);

    if (imgUrl) {
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => {
            img.remove();
            avatar.textContent = initial;
        });
        avatar.appendChild(img);
    } else {
        avatar.textContent = initial;
    }
    root.appendChild(avatar);

    if (name) {
        const h1 = document.createElement("h1");
        h1.className = "profile-name";
        h1.textContent = name;
        root.appendChild(h1);
    }

    if (profile.slug) {
        const handle = document.createElement("p");
        handle.className = "profile-handle";
        handle.textContent = "@" + profile.slug;
        root.appendChild(handle);
    }

    const bioText = profile.bio.trim() || (placeholder ? "Your short bio goes here." : "");
    if (bioText) {
        const bio = document.createElement("p");
        bio.className = "profile-bio";
        bio.textContent = bioText;
        root.appendChild(bio);
    }

    const list = document.createElement("ul");
    list.className = "profile-links";

    const resolved = profile.links.map(resolveLink).filter(Boolean);

    resolved.forEach((link) => {
        const platform = PLATFORMS[link.platform];
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = link.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.style.background = platform.color;
        badge.innerHTML = iconMarkup(link.platform, 22);

        const text = document.createElement("span");
        text.className = "link-text";
        const label = document.createElement("span");
        label.className = "link-label";
        label.textContent = link.label;
        text.appendChild(label);

        if (link.sub && link.sub !== link.label) {
            const sub = document.createElement("span");
            sub.className = "link-sub";
            sub.textContent = link.sub;
            text.appendChild(sub);
        }

        a.append(badge, text);
        li.appendChild(a);
        list.appendChild(li);
    });

    if (resolved.length === 0 && placeholder) {
        const empty = document.createElement("li");
        empty.className = "profile-empty";
        empty.textContent = "Add a link and it shows up here.";
        list.appendChild(empty);
    }

    root.appendChild(list);
}

/* Lets server.js reuse the same cleaning rules */
if (typeof module !== "undefined" && module.exports) {
    module.exports = { cleanProfile, slugify, SLUG_PATTERN };
}
