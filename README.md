# LovePageRecord · 爱意记录

面向情侣二人的轻量级「双向爱意记录」静态网页：每人一个账号登录，为对方写下文字并可附多张配图；对方登录后在列表中只能看到**写给 Ta 的记录**。

- **纯前端**：`HTML / CSS / 原生 JavaScript`，无打包步骤  
- **数据**：可选用 [Supabase](https://supabase.com) 做云端同步；未配置时在浏览器 **localStorage** 仅存本机  

---

## 仓库结构

| 路径 | 说明 |
|------|------|
| `love-record/` | 站点根目录，含 `index.html`、`css/`、`js/` |
| `love-record/js/config.defaults.js` | 可入库的占位配置（无真实密钥） |
| `love-record/js/config.local.example.js` | 复制为 `config.local.js` 后填写（**勿提交**） |
| `love-record/js/main.js` | 业务逻辑；从 `window.__LOVE_RECORD_CONFIG__` 读配置 |
| `love-record/supabase/schema.sql` | 在 Supabase 中执行一次的建表与 RLS 策略 |
| `love-record/scripts/render-config-from-env.py` | 从 `app.env` 或环境变量生成 `js/config.local.js` |
| `.github/workflows/deploy-pages.yml` | 推送到 `main` 时生成配置并部署到 `gh-pages` |

---

## 为什么不把密钥写进 Git？

- **别人 clone 仓库后不应直接得到你的 Supabase 与登录密码**。  
- 真实配置应放在 **`love-record/js/config.local.js`**（已加入 `.gitignore`），或使用 **`app.env` + 上方 Python 脚本** 生成该文件。  
- 若此前曾把 **anon key、账号密码** 提交过历史，请在 **Supabase → Project Settings → API** 中**轮换（rotate）anon key**，并修改双方密码；必要时对公开仓库使用 [BFG / git filter-repo](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) 清理历史（操作前务必备份）。

### 局限（务必知晓）

- **纯静态站 + 浏览器里的「登录」**只是用 JS 比对账号密码，懂技术的人仍可在网络请求或修改前端后访问你的 Supabase 表（若 RLS 仍允许匿名读写）。要防止「任何拿到链接的陌生人」读写数据，需要 **Supabase Auth**、**签名的 Row Level Security**，或自建后端；本仓库刻意保持极简，仅适合**私密链接、非高敏**场景。

---

## 本地配置

1. 将 `love-record/js/config.local.example.js` **复制为** `love-record/js/config.local.js`。  
2. 编辑后者，填入 `SUPABASE_URL`、`SUPABASE_ANON_KEY`，以及男女双方 `ACCOUNTS`。  
3. **不要**执行 `git add config.local.js`（应保持被忽略）。

若控制台出现 **`config.local.js` 加载 404**，属于未放置该文件的提示，放置并刷新即可；不影响先读占位配置运行（未填密钥时仅能本机离线或无法登录）。

**或用环境文件生成**（不写密钥进仓库）：

```bash
copy love-record\app.env.example love-record\app.env   # Windows
# 编辑 app.env，然后：
python love-record/scripts/render-config-from-env.py
```

脚本会写入 `love-record/js/config.local.js`。

---

## 本地预览

```bash
cd love-record
npx --yes serve .
```

在浏览器打开终端里给出的地址。

---

## Supabase 建表与安全

1. 在 Supabase **SQL Editor** 执行 `love-record/supabase/schema.sql`。  
2. **Project URL** 与 **anon public** key 只填进 **`config.local.js`**（或通过 CI 注入），不要提交仓库。  

若 **`SUPABASE_URL` / `SUPABASE_ANON_KEY` 留空**：应用仅用本机存储，跨设备不同步。

当前示例 RLS 允许匿名 **`SELECT` / `INSERT`**，与本项目「anon key 裸露在浏览器」的假设一致。**不适合**在互联网上大范围公开与高敏感数据。

---

## 部署到 GitHub Pages

1. 仓库 **Settings → Pages**：**Deploy from a branch**，分支 **`gh-pages`**，目录 **`/`（root）**。  
2. 推送 **`main`** 会触发工作流：先根据密钥生成 **`config.local.js`**，再发布 `love-record/`。  
   **自检**：Actions 显示成功后等约 1～2 分钟，打开 **Settings → Pages** 中的站点网址，用已配置的男女双方账号登录，试发一条以确认云端读写正常。

在仓库 **Settings → Secrets and variables → Actions** 中建议配置（名称需与下表一致）：

| Secret 名称 | 说明 |
|-------------|------|
| `SUPABASE_URL` | 项目 URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `LOVE_FEMALE_USERNAME` | 女方登录名 |
| `LOVE_FEMALE_PASSWORD` | 女方密码 |
| `LOVE_MALE_USERNAME` | 男方登录名 |
| `LOVE_MALE_PASSWORD` | 男方密码 |

未配置时，工作流仍会生成空的 `config.local.js`，站点与默认占位一致（无法使用你的私有数据，直到配置 Secrets）。

`index.html` 内含对 GitHub Pages 子路径的 `<base>` 处理，便于 `https://<user>.github.io/<repo>/` 下资源路径正确。

---

## 功能摘要

- 登录 / 退出、会话在 `localStorage`  
- 为对方发布：文字 + 多张图片（前端压缩为 JPEG base64）  
- 未接 Supabase 时提示仅本机保存；开发可加 `?dev=1` 查看维护提示  

---

## 许可

若仓库根目录未包含 `LICENSE` 文件，使用前请自行补充许可条款或联系作者。
