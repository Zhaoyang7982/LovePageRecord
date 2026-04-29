/**
 * 情侣双向爱意记录
 * 配置写在 js/config.defaults.js（占位，可入库）与同目录 config.local.js（勿提交）。
 * 可复制 config.local.example.js 为 config.local.js 后填写；
 * 或运行 love-record/scripts/render-config-from-env.py（读取 app.env / 环境变量）。
 * Supabase：留 URL/key 为空则仅用本机 localStorage。
 * 建表：supabase/schema.sql 在 Supabase SQL Editor 执行一次。
 */
(function () {
  var STORAGE_SESSION = "loveRecord_session";
  var STORAGE_ENTRIES = "loveRecord_entries";
  var EMPTY_TIP =
    "Ta 还没有为你留下记录，把链接发给 Ta 吧～";

  /** @type {object} */
  var _raw = typeof window.__LOVE_RECORD_CONFIG__ !== "undefined"
    ? window.__LOVE_RECORD_CONFIG__
    : {};
  /** 例 https://xxxx.supabase.co */
  var SUPABASE_URL =
    (_raw && _raw.SUPABASE_URL ? String(_raw.SUPABASE_URL) : "").trim();
  /** 一长串 eyJ... 的 anon key */
  var SUPABASE_ANON_KEY =
    (_raw && _raw.SUPABASE_ANON_KEY ? String(_raw.SUPABASE_ANON_KEY) : "").trim();

  /** @type {{ female: {username:string,password:string}, male: {username:string,password:string} }} */
  var ACCOUNTS =
    _raw &&
    _raw.ACCOUNTS &&
    _raw.ACCOUNTS.female &&
    _raw.ACCOUNTS.male &&
    typeof _raw.ACCOUNTS.female.username === "string"
      ? _raw.ACCOUNTS
      : {
          female: { username: "", password: "" },
          male: { username: "", password: "" }
        };

  var ROLE_LABEL = { female: "女方", male: "男方" };

  /** @typedef {'female'|'male'} Role */

  /** @type {Role|null} */
  var currentRole = null;
  /** @type {any|null} */
  var selectedRecord = null;
  /** @type {any[]} */
  var entriesCache = [];
  /** @type {'received'|'sent'} */
  var currentView = "received";
  /** @type {string|null} */
  var editingRecordId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function oppositeRole(role) {
    return role === "female" ? "male" : "female";
  }

  function useRemote() {
    return !!(
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.indexOf("https://") === 0
    );
  }

  function sbHeaders() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };
  }

  function rowToEntry(r) {
    var imgs = r.images;
    if (!Array.isArray(imgs)) imgs = [];
    return {
      id: r.id,
      publisher: r.publisher,
      receiver: r.receiver,
      text: r.body != null ? String(r.body) : "",
      images: imgs,
      createdAt: r.created_at
    };
  }

  function fetchEntriesFromRemote() {
    var base = SUPABASE_URL.replace(/\/$/, "");
    var url = base + "/rest/v1/love_entries?select=*&order=created_at.desc";
    return fetch(url, { headers: sbHeaders() }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || "HTTP " + res.status);
        });
      }
      return res.json();
    }).then(function (rows) {
      return rows.map(rowToEntry);
    });
  }

  function insertEntryRemote(rec) {
    var base = SUPABASE_URL.replace(/\/$/, "");
    var url = base + "/rest/v1/love_entries";
    var payload = {
      id: rec.id,
      publisher: rec.publisher,
      receiver: rec.receiver,
      body: rec.text,
      images: rec.images,
      created_at: rec.createdAt
    };
    return fetch(url, {
      method: "POST",
      headers: Object.assign({}, sbHeaders(), { Prefer: "return=minimal" }),
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || "HTTP " + res.status);
        });
      }
    });
  }

  function updateEntryRemote(rec) {
    var base = SUPABASE_URL.replace(/\/$/, "");
    var url = base + "/rest/v1/love_entries?id=eq." + encodeURIComponent(rec.id);
    var payload = {
      body: rec.text,
      images: rec.images
    };
    return fetch(url, {
      method: "PATCH",
      headers: Object.assign({}, sbHeaders(), { Prefer: "return=minimal" }),
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || "HTTP " + res.status);
        });
      }
    });
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(STORAGE_SESSION);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && (data.role === "female" || data.role === "male")) return data.role;
    } catch (e) {}
    return null;
  }

  function saveSession(role) {
    try {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify({ role: role }));
    } catch (e) {}
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_SESSION);
  }

  function loadEntriesLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_ENTRIES);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntriesLocal(entries) {
    try {
      localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries));
      return true;
    } catch (e) {
      return false;
    }
  }

  function genId() {
    return "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function setSyncLoading(on) {
    if (!useRemote() || !currentRole) return;
    var empty = $("empty-tip");
    var box = $("cards-container");
    if (on) {
      empty.textContent = "正在从云端加载记录…";
      empty.classList.remove("hidden");
      box.classList.add("hidden");
    } else {
      box.classList.remove("hidden");
    }
  }

  function refreshEntries(done) {
    if (!useRemote()) {
      entriesCache = loadEntriesLocal();
      if (typeof done === "function") done(null);
      return;
    }
    fetchEntriesFromRemote()
      .then(function (rows) {
        entriesCache = rows;
        if (typeof done === "function") done(null);
      })
      .catch(function (e) {
        if (typeof done === "function") done(e);
      });
  }

  function updateSyncBanner() {
    var b = $("sync-banner");
    if (!b) return;
    if (!currentRole) {
      b.classList.add("hidden");
      b.textContent = "";
      return;
    }
    if (useRemote()) {
      b.classList.add("hidden");
      b.textContent = "";
      return;
    }
    var devHint = false;
    try {
      devHint = /[?&]dev=1(?:&|$)/.test(String(window.location && window.location.search));
    } catch (e) {}
    if (devHint) {
      b.textContent =
        "[维护] 云端未启用：请配置 js/config.local.js（或环境变量生成），填写 SUPABASE_URL、SUPABASE_ANON_KEY。";
    } else {
      b.textContent =
        "记录目前只保存在本手机；换设备看不到。请将 config.local.example.js 复制为 config.local.js 并填写 Supabase，或在线上由部署流程写入该文件。";
    }
    b.classList.remove("hidden");
  }

  /**
   * 压缩图片为 JPEG base64
   * @param {File} file
   * @param {function(string)} cb
   */
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var maxSide = 1200;
        var w = img.width;
        var h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w >= h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          cb("");
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        var quality = 0.72;
        var dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        } catch (err) {
          dataUrl = canvas.toDataURL("image/png");
        }
        cb(dataUrl);
      };
      img.onerror = function () {
        cb("");
      };
      img.src = reader.result;
    };
    reader.onerror = function () {
      cb("");
    };
    reader.readAsDataURL(file);
  }

  function readFilesAsCompressed(files, done) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) {
      done([]);
      return;
    }
    var out = [];
    var left = list.length;
    list.forEach(function (file) {
      if (!file.type || file.type.indexOf("image") !== 0) {
        left--;
        if (left === 0) done(out);
        return;
      }
      compressImage(file, function (b64) {
        if (b64) out.push(b64);
        left--;
        if (left === 0) done(out);
      });
    });
  }

  function showToast(msg, isError) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    el.classList.toggle("toast--error", !!isError);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.add("hidden");
    }, 2600);
  }

  function setScreens(loggedIn) {
    $("login-screen").classList.toggle("hidden", loggedIn);
    $("app-screen").classList.toggle("hidden", !loggedIn);
  }

  function tryLogin(username, password) {
    var u = (username || "").trim();
    var p = password || "";
    if (ACCOUNTS.female.username === u && ACCOUNTS.female.password === p) {
      return "female";
    }
    if (ACCOUNTS.male.username === u && ACCOUNTS.male.password === p) {
      return "male";
    }
    return null;
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + "年" + m + "月" + day + "日";
  }

  function getVisibleEntries(role) {
    return entriesCache.filter(function (e) {
      if (!e) return false;
      if (currentView === "sent") return e.publisher === role;
      return e.receiver === role;
    });
  }

  function setView(view) {
    currentView = view === "sent" ? "sent" : "received";
    $("btn-view-received").classList.toggle("is-active", currentView === "received");
    $("btn-view-sent").classList.toggle("is-active", currentView === "sent");
    renderCards();
  }

  function floatClass(index) {
    var mods = ["love-card--a", "love-card--b", "love-card--c"];
    return mods[index % 3];
  }

  function renderCards() {
    if (!currentRole) return;
    var entries = getVisibleEntries(currentRole);
    var stats = $("stats-tip");
    if (stats) {
      var sentCount = entriesCache.filter(function (e) {
        return e && e.publisher === currentRole;
      }).length;
      stats.textContent =
        "对方为我做了 " + entries.length + " 条记录 · 我为对方做了 " + sentCount + " 条记录";
    }
    var empty = $("empty-tip");
    var box = $("cards-container");
    box.innerHTML = "";
    empty.textContent = currentView === "sent"
      ? "你还没有为 Ta 发布记录，点击上方按钮开始记录吧～"
      : EMPTY_TIP;
    empty.classList.toggle("hidden", entries.length > 0);
    entries.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    entries.forEach(function (rec, i) {
      var card = document.createElement("article");
      card.className = "love-card " + floatClass(i);
      card.style.animationDelay = (i % 5) * 0.4 + "s";
      card.setAttribute("data-id", rec.id);
      var hasImg = rec.images && rec.images.length > 0;
      var imgWrap = document.createElement("div");
      imgWrap.className = "love-card__img-wrap" + (hasImg ? "" : " love-card__img-wrap--text");
      if (hasImg) {
        var im = document.createElement("img");
        im.src = rec.images[0];
        im.alt = "";
        imgWrap.appendChild(im);
      } else {
        var preview = document.createElement("p");
        preview.className = "love-card__preview-text";
        preview.textContent = rec.text || "（无文字）";
        imgWrap.appendChild(preview);
      }
      var body = document.createElement("div");
      body.className = "love-card__body";
      var dateEl = document.createElement("div");
      dateEl.className = "love-card__date";
      dateEl.textContent = formatDate(rec.createdAt);
      body.appendChild(dateEl);
      if (hasImg) {
        var textEl = document.createElement("p");
        textEl.className = "love-card__text";
        textEl.textContent = rec.text || "（无文字）";
        body.appendChild(textEl);
      }
      if (rec.images && rec.images.length > 1) {
        var more = document.createElement("div");
        more.className = "love-card__more";
        more.textContent = "共 " + rec.images.length + " 张图 · 点击查看";
        body.appendChild(more);
      }
      card.appendChild(imgWrap);
      card.appendChild(body);
      card.addEventListener("click", function () {
        openDetail(rec);
      });
      box.appendChild(card);
    });
  }

  function openDetail(rec) {
    selectedRecord = rec;
    $("detail-date").textContent = formatDate(rec.createdAt);
    var gal = $("detail-gallery");
    gal.innerHTML = "";
    (rec.images || []).forEach(function (src) {
      var im = document.createElement("img");
      im.src = src;
      im.alt = "";
      gal.appendChild(im);
    });
    $("detail-text").textContent = rec.text || "";
    $("btn-edit-detail").classList.toggle(
      "hidden",
      !(rec && rec.publisher === currentRole)
    );
    $("detail-overlay").classList.remove("hidden");
  }

  function closeDetail() {
    $("detail-overlay").classList.add("hidden");
    selectedRecord = null;
  }

  function openImageZoom(src) {
    if (!src) return;
    $("image-zoom").src = src;
    $("image-overlay").classList.remove("hidden");
  }

  function closeImageZoom() {
    $("image-overlay").classList.add("hidden");
    $("image-zoom").removeAttribute("src");
  }

  function openPublish() {
    editingRecordId = null;
    $("publish-title").textContent = "为 Ta 写一条";
    $("publish-form").querySelector('button[type="submit"]').textContent = "发布";
    $("publish-text").value = "";
    $("publish-files-camera").value = "";
    $("publish-files-album").value = "";
    $("publish-preview").innerHTML = "";
    $("publish-preview").removeAttribute("data-urls");
    $("publish-overlay").classList.remove("hidden");
  }

  function openPublishForEdit(rec) {
    if (!rec) return;
    editingRecordId = rec.id;
    $("publish-title").textContent = "编辑这条记录";
    $("publish-form").querySelector('button[type="submit"]').textContent = "保存修改";
    $("publish-text").value = rec.text || "";
    $("publish-files-camera").value = "";
    $("publish-files-album").value = "";
    var urls = Array.isArray(rec.images) ? rec.images.slice() : [];
    $("publish-preview").dataset.urls = JSON.stringify(urls);
    renderPreview($("publish-preview"), urls);
    $("publish-overlay").classList.remove("hidden");
  }

  function closePublish() {
    $("publish-overlay").classList.add("hidden");
  }

  function renderPreview(container, urls) {
    container.innerHTML = "";
    urls.forEach(function (u, idx) {
      var item = document.createElement("div");
      item.className = "preview-item";
      var im = document.createElement("img");
      im.src = u;
      im.alt = "";
      var del = document.createElement("button");
      del.type = "button";
      del.className = "preview-remove";
      del.setAttribute("aria-label", "删除这张图片");
      del.textContent = "×";
      del.setAttribute("data-index", String(idx));
      item.appendChild(im);
      item.appendChild(del);
      container.appendChild(item);
    });
  }

  function appendPreviewFiles(fileList) {
    readFilesAsCompressed(fileList, function (urls) {
      if (!urls.length) return;
      var preview = $("publish-preview");
      var oldUrls = [];
      try {
        oldUrls = preview.dataset.urls ? JSON.parse(preview.dataset.urls) : [];
      } catch (e) {}
      var next = oldUrls.concat(urls);
      preview.dataset.urls = JSON.stringify(next);
      renderPreview(preview, next);
    });
  }

  function enterApp(showWelcome) {
    $("role-badge").textContent = "当前身份：" + ROLE_LABEL[currentRole];
    setScreens(true);
    updateSyncBanner();
    setSyncLoading(true);
    refreshEntries(function (err) {
      setSyncLoading(false);
      if (err) {
        showToast("云端同步失败：" + (err.message || "请检查网络与 Supabase 配置"), true);
      }
      renderCards();
      updateSyncBanner();
    });
    if (showWelcome) showToast("欢迎回来～");
  }

  function init() {
    $("login-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var user = $("login-user").value;
      var pass = $("login-pass").value;
      var role = tryLogin(user, pass);
      if (!role) {
        showToast("账号或密码不正确", true);
        return;
      }
      currentRole = role;
      saveSession(role);
      enterApp(true);
    });

    $("btn-logout").addEventListener("click", function () {
      currentRole = null;
      entriesCache = [];
      clearSession();
      setScreens(false);
      $("login-user").value = "";
      $("login-pass").value = "";
      updateSyncBanner();
    });

    $("btn-open-publish").addEventListener("click", openPublish);
    $("btn-view-received").addEventListener("click", function () {
      setView("received");
    });
    $("btn-view-sent").addEventListener("click", function () {
      setView("sent");
    });
    $("btn-close-publish").addEventListener("click", closePublish);
    $("publish-overlay").addEventListener("click", function (ev) {
      if (ev.target === $("publish-overlay")) closePublish();
    });

    $("btn-pick-camera").addEventListener("click", function () {
      $("publish-files-camera").click();
    });
    $("btn-pick-album").addEventListener("click", function () {
      $("publish-files-album").click();
    });
    $("publish-files-camera").addEventListener("change", function () {
      appendPreviewFiles($("publish-files-camera").files);
      $("publish-files-camera").value = "";
    });
    $("publish-files-album").addEventListener("change", function () {
      appendPreviewFiles($("publish-files-album").files);
      $("publish-files-album").value = "";
    });
    $("publish-preview").addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.classList || !t.classList.contains("preview-remove")) return;
      var idx = Number(t.getAttribute("data-index"));
      if (isNaN(idx)) return;
      var preview = $("publish-preview");
      var urls = [];
      try {
        urls = preview.dataset.urls ? JSON.parse(preview.dataset.urls) : [];
      } catch (e) {}
      if (!urls.length || idx < 0 || idx >= urls.length) return;
      urls.splice(idx, 1);
      preview.dataset.urls = JSON.stringify(urls);
      renderPreview(preview, urls);
    });

    $("publish-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!currentRole) return;
      var text = $("publish-text").value.trim();
      var preview = $("publish-preview");
      var urls = [];
      try {
        urls = preview.dataset.urls ? JSON.parse(preview.dataset.urls) : [];
      } catch (e) {}
      if (!text && (!urls || !urls.length)) {
        showToast("请填写文字或选择至少一张照片", true);
        return;
      }
      var rec = {
        id: editingRecordId || genId(),
        publisher: currentRole,
        receiver: oppositeRole(currentRole),
        text: text,
        images: urls || [],
        createdAt: new Date().toISOString()
      };
      if (editingRecordId) {
        var origin = entriesCache.find(function (e) { return e && e.id === editingRecordId; });
        if (origin) rec.createdAt = origin.createdAt;
      }
      if (useRemote()) {
        var isEditing = !!editingRecordId;
        var action = editingRecordId ? updateEntryRemote(rec) : insertEntryRemote(rec);
        action
          .then(function () {
            return fetchEntriesFromRemote();
          })
          .then(function (rows) {
            entriesCache = rows;
            closePublish();
            renderCards();
            editingRecordId = null;
            showToast(isEditing ? "修改已保存" : "已发布，对方任意设备登录即可看到");
          })
          .catch(function (e) {
            showToast((isEditing ? "保存失败：" : "发布失败：") + (e.message || "未知错误"), true);
          });
      } else {
        var isEditingLocal = !!editingRecordId;
        var all = loadEntriesLocal();
        if (editingRecordId) {
          all = all.map(function (e) {
            return e && e.id === editingRecordId ? rec : e;
          });
        } else {
          all.push(rec);
        }
        if (!saveEntriesLocal(all)) {
          showToast("存储空间不足，请减少图片数量或删除旧记录", true);
          return;
        }
        entriesCache = all;
        closePublish();
        renderCards();
        editingRecordId = null;
        showToast(isEditingLocal ? "修改已保存" : "已发布，对方登录后即可看到");
      }
    });

    $("btn-close-detail").addEventListener("click", closeDetail);
    $("detail-overlay").addEventListener("click", function (ev) {
      if (ev.target === $("detail-overlay")) closeDetail();
    });
    $("detail-gallery").addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || t.tagName !== "IMG") return;
      openImageZoom(t.src || "");
    });
    $("btn-edit-detail").addEventListener("click", function () {
      if (!selectedRecord || selectedRecord.publisher !== currentRole) return;
      closeDetail();
      openPublishForEdit(selectedRecord);
    });
    $("btn-close-image").addEventListener("click", closeImageZoom);
    $("image-overlay").addEventListener("click", function (ev) {
      if (ev.target === $("image-overlay")) closeImageZoom();
    });

    var saved = loadSession();
    if (saved) {
      currentRole = saved;
      enterApp(false);
    } else {
      setScreens(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
