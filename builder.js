const STORAGE_KEY = "linkpage:draft";
const KEYS_STORAGE = "linkpage:keys";

const nameInput = document.getElementById("name");
const slugInput = document.getElementById("slug");
const bioInput = document.getElementById("bio");
const avatarInput = document.getElementById("avatar");
const themeGrid = document.getElementById("theme-grid");
const themeName = document.getElementById("theme-name");
const linksEditor = document.getElementById("links-editor");
const addLinkBtn = document.getElementById("add-link");
const previewRoot = document.getElementById("preview");

const generateBtn = document.getElementById("generate");
const shareMsg = document.getElementById("share-msg");
const shareBox = document.getElementById("share-box");
const shareUrl = document.getElementById("share-url");
const shareNote = document.getElementById("share-note");
const shareNoteText = document.getElementById("share-note-text");
const copyBtn = document.getElementById("copy");
const openLink = document.getElementById("open");

const DEFAULT_PROFILE = {
    name: "",
    slug: "",
    bio: "",
    avatar: "",
    theme: "light",
    links: [{ p: "instagram", v: "", t: "" }],
};

let state = loadDraft();
let slugTouched = Boolean(state.slug);

/* After "Create my link": which kind of link we made and for which page name */
let linkMode = null;        // "short" (saved on the server) or "long" (data inside the link)
let generatedSlug = null;
let saveTimer = null;

/* ---------- Storage ---------- */

function loadDraft() {
    try {
        const clean = cleanProfile(JSON.parse(localStorage.getItem(STORAGE_KEY)));
        if (clean) return clean;
    } catch (e) { /* storage unavailable or corrupted: start fresh */ }
    return structuredClone(DEFAULT_PROFILE);
}

function saveDraft() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function getEditKey(slug) {
    try { return (JSON.parse(localStorage.getItem(KEYS_STORAGE)) || {})[slug] || null; } catch (e) { return null; }
}

function setEditKey(slug, key) {
    try {
        const all = JSON.parse(localStorage.getItem(KEYS_STORAGE)) || {};
        all[slug] = key;
        localStorage.setItem(KEYS_STORAGE, JSON.stringify(all));
    } catch (e) { /* ignore */ }
}

/* ---------- Updating ---------- */

function update() {
    saveDraft();
    renderProfile(previewRoot, state, { placeholder: true });
    themeName.textContent = getTheme(state.theme).name;
    afterEdit();
}

function syncFields() {
    nameInput.value = state.name;
    slugInput.value = state.slug;
    bioInput.value = state.bio;
    avatarInput.value = state.avatar;
}

nameInput.addEventListener("input", () => {
    state.name = nameInput.value;
    if (!slugTouched) {
        state.slug = slugify(state.name);
        slugInput.value = state.slug;
    }
    update();
});

slugInput.addEventListener("input", () => {
    slugTouched = true;
    state.slug = slugify(slugInput.value);
    update();
});

slugInput.addEventListener("blur", () => { slugInput.value = state.slug; });

bioInput.addEventListener("input", () => { state.bio = bioInput.value; update(); });
avatarInput.addEventListener("input", () => { state.avatar = avatarInput.value.trim(); update(); });

/* ---------- Looks ---------- */

function renderThemes() {
    themeGrid.innerHTML = "";

    THEME_LIST.forEach((theme) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-card";
        btn.dataset.theme = theme.id;
        btn.setAttribute("aria-pressed", String(theme.id === state.theme));
        btn.setAttribute("aria-label", theme.name);

        const thumb = document.createElement("span");
        thumb.className = "theme-thumb";
        thumb.style.background = theme.bg;

        const dot = document.createElement("i");
        dot.className = "t-dot";
        dot.style.background = theme.avatar;
        dot.style.borderRadius = theme.radius === 0 ? "0" : "50%";
        thumb.appendChild(dot);

        for (let i = 0; i < 2; i++) {
            const bar = document.createElement("i");
            bar.className = "t-bar";
            bar.style.background = theme.card_style === "outline" ? "transparent" : theme.card;
            bar.style.border = `${theme.card_style === "hard" ? 2 : 1}px solid ${theme.line}`;
            bar.style.borderRadius = theme.radius === 0 ? "0" : theme.radius >= 999 ? "999px" : "5px";
            if (theme.card_style === "hard") bar.style.boxShadow = `2px 2px 0 ${theme.line}`;
            if (theme.card_style === "glow") bar.style.boxShadow = `0 0 6px ${theme.line}`;
            thumb.appendChild(bar);
        }

        const label = document.createElement("span");
        label.className = "theme-label";
        label.textContent = theme.name;

        btn.append(thumb, label);
        btn.addEventListener("click", () => {
            state.theme = theme.id;
            themeGrid.querySelectorAll(".theme-card").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
            update();
        });

        themeGrid.appendChild(btn);
    });
}

/* ---------- Links editor ---------- */

function renderLinksEditor() {
    linksEditor.innerHTML = "";

    state.links.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "link-row";

        const lead = document.createElement("div");
        lead.className = "select-wrap";

        const icon = document.createElement("span");
        icon.className = "select-icon";
        icon.style.background = PLATFORMS[item.p].color;
        icon.innerHTML = iconMarkup(item.p, 16);

        const select = document.createElement("select");
        select.setAttribute("aria-label", `Link ${index + 1} type`);
        Object.entries(PLATFORMS).forEach(([key, platform]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = platform.name;
            option.selected = key === item.p;
            select.appendChild(option);
        });
        lead.append(icon, select);

        const value = document.createElement("input");
        value.type = "text";
        value.autocomplete = "off";
        value.spellcheck = false;
        value.value = item.v;
        value.placeholder = PLATFORMS[item.p].hint;
        value.setAttribute("aria-label", `Link ${index + 1} ${PLATFORMS[item.p].kind === "handle" ? "handle" : "address"}`);

        const title = document.createElement("input");
        title.type = "text";
        title.maxLength = 60;
        title.value = item.t;
        title.placeholder = "Button text, like “My portfolio”";
        title.className = "link-title";
        title.setAttribute("aria-label", `Link ${index + 1} button text`);
        title.hidden = item.p !== "website";

        const actions = document.createElement("div");
        actions.className = "row-actions";
        actions.append(
            iconButton("Move up", "M12 19V5M5 12l7-7 7 7", () => moveLink(index, -1), index === 0),
            iconButton("Move down", "M12 5v14M5 12l7 7 7-7", () => moveLink(index, 1), index === state.links.length - 1),
            iconButton("Remove link", "M6 6l12 12M18 6L6 18", () => removeLink(index), false)
        );

        function markValidity() {
            const invalid = item.v.trim() !== "" && !resolveLink(item);
            value.classList.toggle("invalid", invalid);
            value.setAttribute("aria-invalid", String(invalid));
        }

        select.addEventListener("change", () => {
            item.p = select.value;
            renderLinksEditor();
            update();
        });

        value.addEventListener("input", () => { item.v = value.value; markValidity(); update(); });
        title.addEventListener("input", () => { item.t = title.value; update(); });

        markValidity();
        row.append(lead, value, actions, title);
        linksEditor.appendChild(row);
    });
}

function iconButton(label, path, onClick, disabled) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn";
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.disabled = disabled;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
    btn.addEventListener("click", onClick);
    return btn;
}

function moveLink(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= state.links.length) return;
    [state.links[index], state.links[target]] = [state.links[target], state.links[index]];
    renderLinksEditor();
    update();
}

function removeLink(index) {
    state.links.splice(index, 1);
    renderLinksEditor();
    update();
}

addLinkBtn.addEventListener("click", () => {
    if (state.links.length >= MAX_LINKS) return;
    state.links.push({ p: "instagram", v: "", t: "" });
    renderLinksEditor();
    update();
    const rows = linksEditor.querySelectorAll(".link-row");
    rows[rows.length - 1].querySelector("select").focus();
});

/* ---------- Creating the link ---------- */

function showLink(url, note) {
    shareBox.hidden = false;
    shareUrl.value = url;
    openLink.href = url;
    shareNote.hidden = false;
    shareNoteText.textContent = note;
}

/* Saves the page on the server. Returns "ok", "taken", "offline" or "error". */
async function saveToServer() {
    let response;
    try {
        const key = getEditKey(state.slug);
        response = await fetch("/api/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(key ? { "X-Edit-Key": key } : {}) },
            body: JSON.stringify(state),
        });
    } catch (e) {
        return "offline"; // file:// or no network
    }

    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    if (!isJson) return "offline"; // plain file hosting answers with a web page, not JSON

    const data = await response.json().catch(() => null);
    if (response.ok && data && data.ok) {
        if (data.editKey) setEditKey(state.slug, data.editKey);
        return "ok";
    }
    if (response.status === 409) return "taken";
    if (response.status === 429) return "busy";
    return "error";
}

function validateForShare() {
    if (!state.name.trim()) { shareMsg.textContent = "Add your display name first."; nameInput.focus(); return false; }
    if (!state.slug) { shareMsg.textContent = "Add a page name first."; slugInput.focus(); return false; }
    if (!state.links.some((l) => resolveLink(l))) { shareMsg.textContent = "Add at least one valid link first."; return false; }
    return true;
}

generateBtn.addEventListener("click", async () => {
    shareMsg.textContent = "";
    if (!validateForShare()) return;

    generateBtn.disabled = true;
    generateBtn.textContent = "Creating...";

    const result = await saveToServer();

    generateBtn.disabled = false;
    generateBtn.textContent = "Update my link";

    if (result === "ok") {
        linkMode = "short";
        generatedSlug = state.slug;
        showLink(`${location.origin}/${state.slug}`, "Your changes save to this link automatically. If you change your page name, press the button again to get a new link.");
        shareUrl.focus();
        shareUrl.select();
        return;
    }

    if (result === "taken") {
        generateBtn.textContent = "Create my link";
        shareMsg.textContent = "That page name is already taken. Try another one.";
        slugInput.focus();
        return;
    }

    if (result === "busy") {
        generateBtn.textContent = "Create my link";
        shareMsg.textContent = "Too many saves in a short time. Wait a few minutes and try again.";
        return;
    }

    if (result === "error") {
        generateBtn.textContent = "Create my link";
        shareMsg.textContent = "Something went wrong while saving. Please try again.";
        return;
    }

    // Offline / static hosting: fall back to a link that carries the page inside it
    linkMode = "long";
    generatedSlug = state.slug;
    refreshLongLink();
    shareUrl.focus();
    shareUrl.select();
});

function refreshLongLink() {
    const url = buildLongUrl(state);
    showLink(url, "This site has no server, so your page is stored inside the link and the link is long. If you change something, copy the link again. Run server.js to get short links like yoursite.com/" + (state.slug || "name") + ".");
    shareMsg.textContent = url.length > 1800
        ? "This link is very long and some apps may cut it off. Try a shorter bio or fewer links."
        : "";
}

/* Called after every edit: keep an existing link in step with the page */
function afterEdit() {
    if (!linkMode) return;

    if (linkMode === "long") {
        refreshLongLink();
        return;
    }

    if (state.slug !== generatedSlug) {
        shareMsg.textContent = "You changed the page name. Press “Update my link” to get a new link.";
        return;
    }

    clearTimeout(saveTimer);
    shareMsg.textContent = "";
    saveTimer = setTimeout(async () => {
        if (!validateQuiet()) return;
        const result = await saveToServer();
        shareMsg.textContent = result === "ok" ? "" : "Couldn’t save your latest change. Check your connection.";
    }, 900);
}

/* Auto-save only when the page would pass the same checks as creating it */
function validateQuiet() {
    return state.name.trim() && state.slug && state.links.some((l) => resolveLink(l));
}

copyBtn.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(shareUrl.value);
    } catch (e) {
        shareUrl.select();
        document.execCommand("copy");
    }
    copyBtn.textContent = "Copied";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
});

/* ---------- Start ---------- */

syncFields();
renderThemes();
renderLinksEditor();
update();
