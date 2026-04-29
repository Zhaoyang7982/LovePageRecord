/**
 * 默认占位配置（可提交到 Git）。
 * 真实 Supabase 与账号请写在同目录下的 config.local.js（勿提交），
 * 或由 CI 在部署前根据密钥生成该文件。
 */
window.__LOVE_RECORD_CONFIG__ = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  ACCOUNTS: {
    female: { username: "", password: "" },
    male: { username: "", password: "" }
  }
};
