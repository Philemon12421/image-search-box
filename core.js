/* Shared logic for the link page builder and the public profile page */

const THEMES = ["light", "ink", "indigo"];
const MAX_LINKS = 30;

const PLATFORMS = {
    instagram: { name: "Instagram", abbr: "IG", color: "#e1306c", kind: "handle", hint: "yourhandle", url: (h) => `https://instagram.com/${h}` },
    x:         { name: "X",         abbr: "X",  color: "#14171a", kind: "handle", hint: "yourhandle", url: (h) => `https://x.com/${h}` },
    tiktok:    { name: "TikTok",    abbr: "TT", color: "#111111", kind: "handle", hint: "yourhandle", url: (h) => `https://www.tiktok.com/@${h}` },
    youtube:   { name: "YouTube",   abbr: "YT", color: "#e02b20", kind: "handle", hint: "yourchannel", url: (h) => `https://www.youtube.com/@${h}` },
    linkedin:  { name: "LinkedIn",  abbr: "in", color: "#0a66c2", kind: "handle", hint: "your-name", url: (h) => `https://www.linkedin.com/in/${h}` },
    github:    { name: "GitHub",    abbr: "GH", color: "#24292f", kind: "handle", hint: "yourusername", url: (h) => `https://github.com/${h}` },
    facebook:  { name: "Facebook",  abbr: "FB", color: "#1877f2", kind: "handle", hint: "yourpage", url: (h) => `https://facebook.com/${h}` },
    whatsapp:  { name: "WhatsApp",  abbr: "WA", color: "#1fa855", kind: "phone",  hint: "233501234567 (with country code)", url: (d) => `https://wa.me/${d}` },
    email:     { name: "Email",     abbr: "@",  color: "#62696d", kind: "email",  hint: "you@example.com", url: (e) => `mailto:${e}` },
    website:   { name: "Website or other link", abbr: "↗", color: "#3a47f0", kind: "url", hint: "https://example.com", url: (u) => u },
};

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

/* ---------- Encoding the page into a link ---------- */

function encodeProfile(profile) {
    const json = JSON.stringify(profile);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeProfile(text) {
    try {
        let b64 = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const data = JSON.parse(decodeURIComponent(escape(atob(b64))));
        return cleanProfile(data);
    } catch {
        return null;
    }
}

/* Never trust decoded data: force every field to a safe type and size */
function cleanProfile(data) {
    if (!data || typeof data !== "object") return null;
    const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

    return {
        name: str(data.name, 60),
        slug: slugify(str(data.slug, 30)),
        bio: str(data.bio, 240),
        avatar: str(data.avatar, 500),
        theme: THEMES.includes(data.theme) ? data.theme : "light",
        links: (Array.isArray(data.links) ? data.links : []).slice(0, MAX_LINKS).map((l) => ({
            p: PLATFORMS[l && l.p] ? l.p : "website",
            v: str(l && l.v, 300),
            t: str(l && l.t, 60),
        })),
    };
}

function buildShareUrl(profile) {
    const url = new URL("profile.html", location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("u", profile.slug);
    return url.href + "#" + encodeProfile(profile);
}

/* ---------- Rendering (used by the preview and the public page) ---------- */

function renderProfile(root, profile, { placeholder = false } = {}) {
    root.innerHTML = "";
    root.dataset.theme = THEMES.includes(profile.theme) ? profile.theme : "light";

    const name = profile.name.trim() || (placeholder ? "Your name" : "");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const initial = (name || "?").charAt(0).toUpperCase();
    const imgUrl = safeUrl(profile.avatar);

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
        badge.textContent = platform.abbr;
        badge.setAttribute("aria-hidden", "true");

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
