# CardZero 牌组投稿系统安装

这套代码包含：

- `/submit` 牌组投稿表单
- 图片上传到 Supabase Storage
- 投稿资料进入待审核状态
- `/admin/login` 单管理员安全登录
- `/admin/submissions` 审核、通过、拒绝、删除
- `/deck` 公开显示已通过牌组
- `/deck/[slug]` 牌组详情页
- Cloudflare Turnstile 防机器人（可选但正式站建议开启）
- 服务端验证、文件类型与大小限制
- Supabase RLS 防止浏览器直接读取未审核投稿

---

## 1. 安装套件

在项目根目录执行：

```powershell
npm install @supabase/supabase-js zod
```

---

## 2. 复制文件

把压缩包内的文件夹和文件复制到 Next.js 项目根目录。

同名文件请先备份，特别是：

```text
app/deck/page.tsx
app/submit/page.tsx
```

---

## 3. 建立 Supabase 项目

在 Supabase 建立项目，然后进入：

```text
SQL Editor
```

复制并执行：

```text
supabase/schema.sql
```

---

## 4. 建立 Storage Bucket

Supabase Dashboard：

```text
Storage
→ New bucket
```

设定：

```text
Name: deck-submissions
Public bucket: 开启
File size limit: 5 MB
Allowed MIME types:
image/jpeg
image/png
image/webp
```

上传操作只由服务器 Secret key 执行，不需要建立公开上传 Policy。

---

## 5. 建立环境变量

把：

```text
.env.local.example
```

复制成：

```text
.env.local
```

填入 Supabase URL 和 Secret key。

Secret key / Service Role key 只能放在服务器环境变量，绝对不要加 `NEXT_PUBLIC_`。

---

## 6. 产生管理员密码 Hash

把 `你的管理员密码` 换成强密码：

```powershell
node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('你的管理员密码').digest('hex'))"
```

把结果放入：

```env
ADMIN_PASSWORD_SHA256=这里放输出结果
```

产生 Session Secret：

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

把结果放入：

```env
ADMIN_SESSION_SECRET=这里放输出结果
```

---

## 7. Cloudflare Turnstile

Cloudflare Dashboard 建立 Turnstile Widget，域名加入：

```text
cardzero-tcg.com
www.cardzero-tcg.com
localhost
```

然后填入：

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

本地暂时不设两个 Turnstile 环境变量也可测试投稿；正式站建议启用。

---

## 8. 本地测试

```powershell
npm run dev
```

测试：

```text
http://localhost:3000/submit
http://localhost:3000/admin/login
http://localhost:3000/admin/submissions
http://localhost:3000/deck
```

完整流程：

```text
投稿
→ 后台显示待审核
→ 改成审核通过
→ /deck 出现公开牌组
→ 点击进入详情页
```

---

## 9. 检查构建

```powershell
npm run build
```

---

## 10. Vercel 环境变量

Vercel：

```text
Project
→ Settings
→ Environment Variables
```

加入 `.env.local` 中的所有变量。然后重新部署。

---

## 11. 上传 GitHub

```powershell
git add .
git commit -m "Add complete deck submission system"
git push origin main
```

---

## 安全提醒

不要提交：

```text
.env.local
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
TURNSTILE_SECRET_KEY
ADMIN_SESSION_SECRET
```

确认 `.gitignore` 包含：

```gitignore
.env*
```
