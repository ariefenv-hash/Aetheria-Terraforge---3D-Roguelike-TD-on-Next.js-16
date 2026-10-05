# 部署 Aetheria: Terraforge 到 Vercel 完整指南

本游戏是一个 **Next.js 16 + Three.js** 全静态前端项目（无后端 API、无数据库依赖），可以零配置直接部署到 Vercel。

## 📋 部署前置检查

✅ **已确认项目特性**：
- 纯客户端游戏，所有逻辑运行在浏览器
- 不调用任何后端 API 路由（`/api/*` 无业务逻辑）
- 不使用 Prisma 数据库（虽然 `src/lib/db.ts` 存在但游戏代码未引用）
- 不需要任何环境变量（`.env` 中的 `DATABASE_URL` 仅 Prisma 用，游戏运行时不需要）
- 唯一的"后端"代码是 `next/font/google` 字体加载（Vercel 原生支持）

## 🚀 推荐方式 A：GitHub + Vercel 自动部署（最省心）

### 第 1 步：在本地准备一个干净的仓库

```bash
cd /home/z/my-project

# 1. 确保所有改动已提交
git add -A
git commit -m "feat: Aetheria Terraforge - Next.js 16 migration + UX/progression upgrades"

# 2. 当前 git 历史里有沙箱自动生成的 commit，建议压成单个干净 commit
# （可选）重置到一个干净的初始提交：
# git checkout --orphan clean-main
# git add -A
# git commit -m "Initial commit: Aetheria Terraforge 3D Roguelike TD"
# git branch -D main && git branch -m main
```

### 第 2 步：推送到你自己的 GitHub 仓库

```bash
# 在 https://github.com/new 新建一个空仓库，名字建议 aetheria-terraforge
# 不要勾选 "Add README" / "Add .gitignore"，保持完全空白

# 然后关联远程并推送
git remote add origin https://github.com/<你的用户名>/aetheria-terraforge.git
git branch -M main
git push -u origin main
```

> 💡 如果当前已有 `origin` 指向沙箱仓库，先用 `git remote remove origin` 移除再添加新的。

### 第 3 步：在 Vercel 网页一键导入

1. 打开 https://vercel.com ，用你的 GitHub 账号登录（首次会要求授权）
2. 点右上角 **"Add New…"** → **"Project"**
3. 在 "Import Git Repository" 列表中找到 `aetheria-terraforge`，点 **"Import"**
4. 配置页填写：
   - **Framework Preset**: Next.js（自动识别，无需改）
   - **Root Directory**: `./`（默认）
   - **Build Command**: `next build`（**不要用 `npm run build`**，原 `package.json` 里的 build 脚本含 standalone 复制逻辑，那是给 Docker 用的，Vercel 不需要）
   - **Output Directory**: 留空（Vercel 自动识别）
   - **Install Command**: 留空（自动用 `bun install` 或 `npm install`）
   - **Environment Variables**: 全部留空 — 本游戏不需要任何环境变量！
5. 点 **"Deploy"**

### 第 4 步：等待构建（约 2–4 分钟）

Vercel 会自动：
- 安装依赖（约 60 秒）
- 构建 Next.js（约 60–90 秒，Three.js 体积较大需要时间）
- 部署到全球 CDN

构建日志中可能看到 `prisma:warn` 或 `@prisma/client` 相关警告，**可以忽略** — 因为 `src/lib/db.ts` 在生产环境会创建 `PrismaClient` 实例，但游戏运行时根本不会调用它，所以即使没有 `DATABASE_URL` 也不影响游戏。

### 第 5 步：拿到线上 URL

部署完成后 Vercel 会给你一个 `<project-name>.vercel.app` 的域名，直接打开就能玩。

## 🛠 方式 B：Vercel CLI 直接部署（不想用 GitHub 也能跑）

```bash
# 1. 安装 Vercel CLI（任选一种）
npm i -g vercel
# 或者
bun add -g vercel

# 2. 登录（会打开浏览器）
vercel login

# 3. 在项目目录下部署
cd /home/z/my-project
vercel

# 第一次会问几个问题，全部按回车用默认即可：
# ? Set up and deploy "/home/z/my-project"? [Y/n]  y
# ? Which scope should contain your project?  <你的用户名>
# ? Link to existing project? [y/N]  n
# ? What's your project's name?  aetheria-terraforge
# ? In which directory is your code located?  ./
# ? Want to modify these settings? [y/N]  n

# 4. 部署预览成功后，正式推到生产环境
vercel --prod
```

## ⚠️ 已知注意事项

### 1. Prisma 警告（无害）
首次构建日志可能会出现：
```
prisma:warn Prisma needs to perform updates for ...
```
**原因**：项目模板内置了 Prisma，但游戏没用数据库。
**处理**：**忽略即可**，不影响功能。如果想彻底消除，可以执行：
```bash
# 可选：彻底移除 Prisma（不影响游戏功能）
bun remove prisma @prisma/client
rm -rf prisma/ src/lib/db.ts
# 然后删掉 package.json 里的 db:push / db:generate / db:migrate / db:reset 脚本
```

### 2. 构建时间较长
Three.js + Next.js 16 Turbopack 首次冷构建约 90–180 秒，Vercel 免费档构建时间足够。后续增量构建会快很多。

### 3. 游戏存档存储在玩家浏览器
游戏使用 `localStorage` 保存玩家档案、成就、存档槽 — 这些数据存储在每个玩家自己的浏览器里，**不会跟着你的部署走**，也不需要服务器存储。这是设计上的优势：零数据库 + 零运维。

### 4. 自定义域名
部署成功后，在 Vercel 项目设置 → Domains 里可以添加你自己的域名（如 `terraforge.your-domain.com`），Vercel 会自动配 HTTPS 证书。

## 📦 项目大小预估
- 仓库源码：约 1.5 MB
- 安装后 node_modules：约 1.3 GB（Vercel 构建时使用，不占你的空间）
- 部署后产物：约 50–80 MB（含 Three.js chunks）

## 🔗 推送后常用操作

### 更新游戏版本
```bash
# 本地改代码后
git add -A && git commit -m "update: xxx"
git push origin main
# Vercel 会自动检测 push 并重新部署
```

### 查看部署日志
- 网页：Vercel Dashboard → 你的项目 → Deployments tab → 点最新一次部署
- CLI：`vercel inspect <deployment-url>`

### 回滚到旧版本
Vercel Dashboard → Deployments → 找到要回滚的版本 → "Promote to Production"

## ❓ 常见问题

**Q: 部署后页面白屏？**
A: 检查浏览器 console。最可能是 Three.js WebGL 在低端设备加载失败 — 游戏已设计 fallback splash，正常情况不会白屏。

**Q: 字体加载失败？**
A: Vercel 会自动代理 Google Fonts，无需特殊配置。如果国内访问慢，可以改用本地字体文件。

**Q: 部署成功但 3D canvas 不显示？**
A: 检查浏览器 WebGL 是否开启（chrome://gpu 查看状态）。

**Q: 如何给游戏添加访问统计？**
A: 在 Vercel 项目设置里 Analytics tab 开启（免费档每月 1000 events）。

---

## 推荐流程总结

最推荐路径：**GitHub 方式 A**，因为后续每次 `git push` Vercel 都会自动重新部署，无需手动操作。

整个流程预计耗时：**5–10 分钟**（不含 Vercel 构建时间）。
