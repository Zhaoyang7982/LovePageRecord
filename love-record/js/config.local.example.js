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
      female: { username: "玉玉账号", password: "玉玉密码" },
      male: { username: "奇奇账号", password: "奇奇密码" }
    }
  });
})();
