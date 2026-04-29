# LovePageRecord（爱意记录）

`LovePageRecord` 是一个面向双人场景的轻量级记录系统。双方可分别登录，发布文字与图片内容，并查看对方为自己留下的记录。

项目采用纯前端实现（`HTML + CSS + Vanilla JavaScript`），支持两种数据模式：

- 云端模式：使用 [Supabase](https://supabase.com) 实现跨设备同步
- 本地模式：未配置 Supabase 时，数据保存在浏览器 `localStorage`

---

## 核心功能

- 双账号登录与角色区分（女方 / 男方）
- 为对方发布记录（文字 + 多图）
- 图片来源支持手机拍照与本地相册选择
- 发布前可删除已选图片
- 记录详情图片支持点击放大查看
- 首页显示双向统计：
  - 对方为我做了多少条记录
  - 我为对方做了多少条记录
- 未启用云端时显示同步提示

---

## 项目结构

| 路径 | 说明 |
|------|------|
| `love-record/` | 站点根目录（可直接部署） |
| `love-record/index.html` | 页面结构 |
| `love-record/css/style.css` | 页面样式 |
| `love-record/js/main.js` | 业务逻辑 |
| `love-record/js/config.defaults.js` | 可提交的默认配置（无敏感信息） |
| `love-record/js/config.local.example.js` | 本地配置示例 |
| `love-record/supabase/schema.sql` | Supabase 建表与策略脚本 |
| `love-record/scripts/render-config-from-env.py` | 从环境变量或 `app.env` 生成 `config.local.js` |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 自动部署工作流 |

---

## 快速开始

### 1）本地启动

```bash
cd love-record
npx --yes serve .
```

执行后在浏览器访问终端输出地址。

### 2）配置账号与 Supabase

推荐方式：复制 `love-record/js/config.local.example.js` 为 `love-record/js/config.local.js`，并填写以下字段：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ACCOUNTS.female.username` / `ACCOUNTS.female.password`
- `ACCOUNTS.male.username` / `ACCOUNTS.male.password`

> `config.local.js` 已被 `.gitignore` 忽略，不应提交到仓库。

---

## Supabase 初始化

1. 在 Supabase 创建项目  
2. 打开 **SQL Editor**，执行 `love-record/supabase/schema.sql`  
3. 从项目设置获取 `Project URL` 与 `anon public key`  
4. 写入本地配置或通过 CI 注入

若 `SUPABASE_URL` 或 `SUPABASE_ANON_KEY` 为空，应用将自动回退为本地存储模式。

---

## 部署（GitHub Pages）

项目默认通过 GitHub Actions 自动部署：

1. 在仓库 `Settings > Pages` 中设置：
   - Source: `Deploy from a branch`
   - Branch: `gh-pages`
   - Folder: `/ (root)`
2. 推送到 `main` 分支后，工作流将：
   - 读取 Secrets
   - 生成 `love-record/js/config.local.js`
   - 将 `love-record/` 发布到 `gh-pages`

建议在仓库 `Settings > Secrets and variables > Actions` 中配置以下 Secrets：

| Secret 名称 | 说明 |
|-------------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase 匿名公钥 |
| `LOVE_FEMALE_USERNAME` | 女方账号 |
| `LOVE_FEMALE_PASSWORD` | 女方密码 |
| `LOVE_MALE_USERNAME` | 男方账号 |
| `LOVE_MALE_PASSWORD` | 男方密码 |

---

## 安全说明

- 请勿将真实账号密码、URL、Key 直接写入可提交文件。
- 历史上若已泄露密钥，建议立即轮换 Supabase `anon key` 与账号密码。
- 当前项目为纯静态前端方案，适用于私密、低敏感场景。
- 如需更高安全性，请引入 Supabase Auth、细粒度 RLS 或后端鉴权。

---

## 许可

若仓库未包含 `LICENSE` 文件，请在对外使用前补充许可证声明。
