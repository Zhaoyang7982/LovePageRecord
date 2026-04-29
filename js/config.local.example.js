/**
 * 复制为 config.local.js 后填写（config.local.js 已在 .gitignore）
 * 或：配置环境变量后运行 scripts/render-config-from-env.py 生成。
 */
(function () {
  var g = window.__LOVE_RECORD_CONFIG__;
  if (!g) return;
  Object.assign(g, {
    SUPABASE_URL: "https://你的项目.supabase.co",
    SUPABASE_ANON_KEY: "eyJ... Supabase 设置里的 anon public key",
    ACCOUNTS: {
      female: { username: "女方账号", password: "女方密码" },
      male: { username: "男方账号", password: "男方密码" }
    }
  });
})();
