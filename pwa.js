/* Registers the service worker, offers an "Install app" button, and shows an offline notice */
(function () {
    "use strict";

    /* ---------- Service worker (only on http/https, not file://) ---------- */
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
        window.addEventListener("load", function () {
            navigator.serviceWorker.register("sw.js").catch(function () { /* the site still works without it */ });
        });
    }

    /* ---------- Install button ---------- */
    var installEvent = null;
    var installBtn = null;

    function isInstalled() {
        return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    }

    function showInstallButton() {
        if (!installEvent || isInstalled()) return;
        var nav = document.querySelector(".topbar-nav");
        if (!nav) return;

        if (!installBtn) {
            installBtn = document.createElement("button");
            installBtn.type = "button";
            installBtn.className = "install-btn";
            installBtn.textContent = "Install app";
            installBtn.addEventListener("click", function () {
                if (!installEvent) return;
                installEvent.prompt();
                installEvent.userChoice.finally(function () {
                    installEvent = null;
                    hideInstallButton();
                });
            });
            nav.appendChild(installBtn);
        }
        installBtn.hidden = false;
    }

    function hideInstallButton() {
        if (installBtn) installBtn.hidden = true;
    }

    window.addEventListener("beforeinstallprompt", function (event) {
        event.preventDefault();
        installEvent = event;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", showInstallButton);
        } else {
            showInstallButton();
        }
    });

    window.addEventListener("appinstalled", function () {
        installEvent = null;
        hideInstallButton();
    });

    /* ---------- Offline notice ---------- */
    var toast = null;

    function setOffline(offline) {
        if (offline) {
            if (!toast) {
                toast = document.createElement("div");
                toast.className = "net-toast";
                toast.setAttribute("role", "status");
                toast.textContent = "You’re offline. Saved pages still work.";
                document.body.appendChild(toast);
            }
            toast.hidden = false;
        } else if (toast) {
            toast.hidden = true;
        }
    }

    window.addEventListener("offline", function () { setOffline(true); });
    window.addEventListener("online", function () { setOffline(false); });
    document.addEventListener("DOMContentLoaded", function () {
        if (!navigator.onLine) setOffline(true);
    });
})();
