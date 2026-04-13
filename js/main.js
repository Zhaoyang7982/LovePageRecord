/**
 * 情侣双向爱意记录 — 纯前端 + LocalStorage
 * 请务必修改下方账号密码后再部署使用。
 */
(function () {
  var STORAGE_SESSION = "loveRecord_session";
  var STORAGE_ENTRIES = "loveRecord_entries";

  /** @type {{ female: {username:string,password:string}, male: {username:string,password:string} }} */
  var ACCOUNTS = {
    female: { username: "yuyu", password: "0321" },
    male: { username: "qiqi", password: "1112" }
  };

  var ROLE_LABEL = { female: "女方", male: "男方" };

  /** @typedef {'female'|'male'} Role */

  /** @type {Role|null} */
  var currentRole = null;
  /** @type {any|null} */
  var selectedRecord = null;

  function $(id) {
    return document.getElementById(id);
  }

  function oppositeRole(role) {
    return role === "female" ? "male" : "female";
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

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_ENTRIES);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
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
    return loadEntries().filter(function (e) {
      return e && e.receiver === role;
    });
  }

  function floatClass(index) {
    var mods = ["love-card--a", "love-card--b", "love-card--c"];
    return mods[index % 3];
  }

  function renderCards() {
    if (!currentRole) return;
    var entries = getVisibleEntries(currentRole);
    var empty = $("empty-tip");
    var box = $("cards-container");
    box.innerHTML = "";
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
      } else {
        var hint = document.createElement("p");
        hint.className = "love-card__hint";
        hint.textContent = "点击查看全文";
        body.appendChild(hint);
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
    $("detail-overlay").classList.remove("hidden");
  }

  function closeDetail() {
    $("detail-overlay").classList.add("hidden");
    selectedRecord = null;
  }

  function openPublish() {
    $("publish-text").value = "";
    $("publish-files").value = "";
    $("publish-preview").innerHTML = "";
    $("publish-overlay").classList.remove("hidden");
  }

  function closePublish() {
    $("publish-overlay").classList.add("hidden");
  }

  function renderPreview(container, urls) {
    container.innerHTML = "";
    urls.forEach(function (u) {
      var im = document.createElement("img");
      im.src = u;
      im.alt = "";
      container.appendChild(im);
    });
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
      $("role-badge").textContent = "当前身份：" + ROLE_LABEL[role];
      setScreens(true);
      renderCards();
      showToast("欢迎回来～");
    });

    $("btn-logout").addEventListener("click", function () {
      currentRole = null;
      clearSession();
      setScreens(false);
      $("login-user").value = "";
      $("login-pass").value = "";
    });

    $("btn-open-publish").addEventListener("click", openPublish);
    $("btn-close-publish").addEventListener("click", closePublish);
    $("publish-overlay").addEventListener("click", function (ev) {
      if (ev.target === $("publish-overlay")) closePublish();
    });

    $("publish-files").addEventListener("change", function () {
      readFilesAsCompressed($("publish-files").files, function (urls) {
        $("publish-preview").dataset.urls = JSON.stringify(urls);
        renderPreview($("publish-preview"), urls);
      });
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
        id: genId(),
        publisher: currentRole,
        receiver: oppositeRole(currentRole),
        text: text,
        images: urls || [],
        createdAt: new Date().toISOString()
      };
      var all = loadEntries();
      all.push(rec);
      if (!saveEntries(all)) {
        showToast("存储空间不足，请减少图片数量或删除旧记录", true);
        return;
      }
      closePublish();
      renderCards();
      showToast("已发布，对方登录后即可看到");
    });

    $("btn-close-detail").addEventListener("click", closeDetail);
    $("detail-overlay").addEventListener("click", function (ev) {
      if (ev.target === $("detail-overlay")) closeDetail();
    });

    $("btn-delete-record").addEventListener("click", function () {
      if (!selectedRecord || !currentRole) return;
      if (selectedRecord.receiver !== currentRole) return;
      if (!window.confirm("确定删除这条记录吗？")) return;
      var all = loadEntries().filter(function (e) {
        return e.id !== selectedRecord.id;
      });
      if (!saveEntries(all)) {
        showToast("保存失败，请稍后重试", true);
        return;
      }
      closeDetail();
      renderCards();
      showToast("已删除");
    });

    $("btn-edit-record").addEventListener("click", function () {
      if (!selectedRecord || !currentRole) return;
      if (selectedRecord.receiver !== currentRole) return;
      $("edit-id").value = selectedRecord.id;
      $("edit-text").value = selectedRecord.text || "";
      $("edit-files").value = "";
      $("edit-preview").innerHTML = "";
      $("edit-preview").dataset.existing = JSON.stringify(selectedRecord.images || []);
      (selectedRecord.images || []).forEach(function (u) {
        var im = document.createElement("img");
        im.src = u;
        $("edit-preview").appendChild(im);
      });
      $("detail-overlay").classList.add("hidden");
      $("edit-overlay").classList.remove("hidden");
    });

    $("btn-close-edit").addEventListener("click", function () {
      $("edit-overlay").classList.add("hidden");
      if (selectedRecord) $("detail-overlay").classList.remove("hidden");
    });
    $("edit-overlay").addEventListener("click", function (ev) {
      if (ev.target === $("edit-overlay")) {
        $("edit-overlay").classList.add("hidden");
        if (selectedRecord) $("detail-overlay").classList.remove("hidden");
      }
    });

    $("edit-files").addEventListener("change", function () {
      readFilesAsCompressed($("edit-files").files, function (newUrls) {
        var existing = [];
        try {
          existing = JSON.parse($("edit-preview").dataset.existing || "[]");
        } catch (e) {}
        var merged = existing.concat(newUrls);
        $("edit-preview").dataset.existing = JSON.stringify(merged);
        renderPreview($("edit-preview"), merged);
      });
    });

    $("edit-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var id = $("edit-id").value;
      var text = $("edit-text").value.trim();
      var existing = [];
      try {
        existing = JSON.parse($("edit-preview").dataset.existing || "[]");
      } catch (e) {}
      if (!text && (!existing || !existing.length)) {
        showToast("请保留文字或至少一张照片", true);
        return;
      }
      var all = loadEntries().map(function (e) {
        if (e.id !== id) return e;
        if (e.receiver !== currentRole) return e;
        return {
          id: e.id,
          publisher: e.publisher,
          receiver: e.receiver,
          text: text,
          images: existing,
          createdAt: e.createdAt
        };
      });
      if (!saveEntries(all)) {
        showToast("存储空间不足，请减少图片后重试", true);
        return;
      }
      $("edit-overlay").classList.add("hidden");
      closeDetail();
      renderCards();
      showToast("已保存修改");
    });

    var saved = loadSession();
    if (saved) {
      currentRole = saved;
      $("role-badge").textContent = "当前身份：" + ROLE_LABEL[saved];
      setScreens(true);
      renderCards();
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
