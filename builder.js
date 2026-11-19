const STORAGE_KEY = "linkpage:draft";

const nameInput = document.getElementById("name");
const slugInput = document.getElementById("slug");
const bioInput = document.getElementById("bio");
const avatarInput = document.getElementById("avatar");
const themeButtons = document.querySelectorAll(".theme-btn");
const linksEditor = document.getElementById("links-editor");
const addLinkBtn = document.getElementById("add-link");
const previewRoot = document.getElementById("preview");

const generateBtn = document.getElementById("generate");
const shareMsg = document.getElementById("share-msg");
const shareBox = document.getElementById("share-box");
const shareUrl = document.getElementById("share-url");
const shareNote = document.getElementById("share-note");
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
let linkGenerated = false;

/* ---------- Storage ---------- */

function loadDraft() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const clean = cleanProfile(saved);
        if (clean) return clean;
    } catch (e) {
        /* storage unavailable or corrupted: start fresh */
    }
    return structuredClone(DEFAULT_PROFILE);
}

function saveDraft() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        /* ignore: the page still works without saving */
    }
}

/* ---------- Updating ---------- */

function update() {
    saveDraft();
    renderProfile(previewRoot, state, { placeholder: true });
    if (linkGenerated) refreshShareLink();
}

function syncFields() {
    nameInput.value = state.name;
    slugInput.value = state.slug;
    bioInput.value = state.bio;
    avatarInput.value = state.avatar;
    themeButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.theme === state.theme)));
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

slugInput.addEventListener("blur", () => {
    slugInput.value = state.slug;
});

bioInput.addEventListener("input", () => {
    state.bio = bioInput.value;
    update();
});

avatarInput.addEventListener("input", () => {
    state.avatar = avatarInput.value.trim();
    update();
});

themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        state.theme = btn.dataset.theme;
        themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        update();
    });
});

/* ---------- Links editor ---------- */

function renderLinksEditor() {
    linksEditor.innerHTML = "";

    state.links.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "link-row";

        const select = document.createElement("select");
        select.setAttribute("aria-label", `Link ${index + 1} type`);
        Object.entries(PLATFORMS).forEach(([key, platform]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = platform.name;
            option.selected = key === item.p;
            select.appendChild(option);
        });

        const value = document.createElement("input");
        value.type = "text";
        value.autocomplete = "off";
        value.spellcheck = false;
        value.value = item.v;
        value.placeholder = PLATFORMS[item.p].hint;
        value.setAttribute("aria-label", `Link ${index + 1} ${PLATFORMS[item.p].kind === "handle" ? "handle" : "address"}`);

        const showTitle = item.p === "website";
        const title = document.createElement("input");
        title.type = "text";
        title.maxLength = 60;
        title.value = item.t;
        title.placeholder = "Button text, like “My portfolio”";
        title.className = "link-title";
        title.setAttribute("aria-label", `Link ${index + 1} button text`);
        title.hidden = !showTitle;

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

        value.addEventListener("input", () => {
            item.v = value.value;
            markValidity();
            update();
        });

        title.addEventListener("input", () => {
            item.t = title.value;
            update();
        });

        markValidity();
        row.append(select, value, actions, title);
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

function refreshShareLink() {
    const url = buildShareUrl(state);
    shareUrl.value = url;
    openLink.href = url;
    shareNote.hidden = false;

    shareMsg.textContent = url.length > 1800
        ? "Your link is very long. Some apps may cut it off, so try removing a link or shortening your bio."
        : "";
}

generateBtn.addEventListener("click", () => {
    const hasLink = state.links.some((l) => resolveLink(l));

    if (!state.name.trim()) {
        shareMsg.textContent = "Add your display name first.";
        nameInput.focus();
        return;
    }
    if (!state.slug) {
        shareMsg.textContent = "Add a page name first.";
        slugInput.focus();
        return;
    }
    if (!hasLink) {
        shareMsg.textContent = "Add at least one valid link first.";
        return;
    }

    linkGenerated = true;
    shareBox.hidden = false;
    refreshShareLink();
    generateBtn.textContent = "Update my link";
    shareUrl.focus();
    shareUrl.select();
});

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
renderLinksEditor();
update();
