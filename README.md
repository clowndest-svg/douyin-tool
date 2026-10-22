# Douyin Tool · 多平台视频/图集下载器

一个本地运行的多平台下载工具：支持抖音主页批量、YouTube / TikTok / X / 小红书等通用链接，支持视频、图集、Live Photo 动态照片、清晰度选择、手机访问和独立 APK。

> 仅用于个人学习与备份已公开内容，请遵守各平台用户协议。

## 功能

### 抖音
- 按抖音号抓取主页全部作品
- 类型识别：视频 / 图片 / 动态图（Live Photo）/ 混合
- 图集按原格式保存，Live Photo 额外保存 `_live.mp4`
- 跳过已下载、失败重试、下载进度
- 列表列：封面、标题、类型、发布时间、时长、点赞、评论、状态

### 多平台（yt-dlp）
- YouTube / TikTok / X / 小红书等
- 粘贴作品或主页链接，自动解析列表
- 清晰度：最佳 / 4K / 1080p / 720p / 480p / 360p / 仅音频
- 自动导出浏览器 cookies，支持登录内容
- 按平台分目录保存

### 安全与易用
- 安全模式（防封）：单批 20 条、每条 3~8 秒、批间 60 秒、每日上限 200
- 可关闭安全模式（风险自担）
- 保存目录自选
- 局域网手机访问（token 保护）、手机下载文件
- 文件在线预览（视频/图片）
- CSV 导出
- 一键更新 yt-dlp

### 导出方案（导出前一次定清：类型 / 去向 / 打包）
- 勾选作品后，列表上方的「导出方案」卡片决定这一批怎么交付，点「开始导出」一步到位，不需要先去文件列表二次勾选
- 内容类型：图片 / 动态图 / 视频 三个开关（至少留一个），只要动态图就不会顺手下静态图
- 电脑：写入所选目录（页面内逐层浏览目录，服务器上同样可用）
- 手机相册：电脑先下好，本机浏览器逐个拉回；App 直接写媒体库（视频 `DCIM/抖音下载器`、图片 `Pictures/抖音下载器`），不依赖系统 DownloadManager
- 夸克网盘：下完自动上传到指定网盘目录（不存在的路径会自动建）；未连接或未填目录时按钮置灰并写明原因
  - 连接方式：点「显示登录二维码」用手机夸克 App 扫（服务器无头也能用），或粘贴网页版 Cookie（保存前先向夸克校验）
  - >4MB 自动 4MB 分片上传，云端同一文件会秒传
- 合成一个压缩包：本次产出打成 zip（内部保留 图片/动态图/视频 分类），电脑得到 zip、网盘传 zip、手机下载 zip
- 接口：`/api/download` 收 `target` / `quarkPath` / `types` / `pack`，产出与 zip 名回在 `/api/status`
- 下载进度、上传进度各一张动画进度卡（百分比 + 当前文件 + 本文件字节进度），日志默认折叠

### 交付形态
- Windows 免安装便携包（内置 Node + Chromium + yt-dlp + ffmpeg）
- 独立 Android APK（WebView 媒体嗅探）
- systemd 线上部署 + GitHub Actions CI

## 快速开始

### 便携包（推荐）
1. 解压
2. 双击 `启动工具.bat`
3. 打开 http://127.0.0.1:3210
4. 在页面内登录抖音
5. 输入抖音号 → 获取视频 → 下载

详细步骤见包内 `使用说明.docx` / `快速开始.txt`。

### 从源码运行
要求：Node.js 18+、Chrome（Windows）或 Playwright Chromium（Linux）。

```bash
npm install
node server.js
```

访问 http://127.0.0.1:3210 。

### 环境变量

| 变量 | 说明 |
|---|---|
| `PORT` | 监听端口，默认 3210 |
| `HEADLESS=1` | 无头模式（服务器/无桌面环境） |

## 使用

### 登录抖音
页面内二维码 / 验证码 / 密码登录。登录态保存在 `profile/`，重启复用。
后台浏览器空闲 5 分钟自动关闭以释放内存（`BROWSER_IDLE_MIN` 可调），登录态不受影响。

云服务器 IP 常被抖音风控：不下发二维码、验证码接口也被拦。此时页面会明确报
「抖音没给这台服务器返回二维码图片」，正确做法是在本机登录后用
`POST /api/login/sync {"target":"http://服务器:3210/?token=…"}`（界面里的「把本机登录态同步过去」）
把 cookie 推到线上，线上 `POST /api/login/import` 注入后即视为已登录。

### 抖音主页
平台选择「抖音主页」，输入抖音号，获取视频，勾选下载。

### 通用链接
平台选择「通用链接」，粘贴链接，选择清晰度，获取并下载。

需要登录的平台（TikTok / X / 小红书）：先在工具浏览器登录，保持「使用浏览器 cookies」开启。

### 手机访问
手机与电脑同一局域网，打开页面显示的地址：

```
http://<电脑IP>:3210/?token=<token>
```

token 见工具目录 `token.txt`。

## 项目结构

```
server.js              Express + Playwright 服务
quark.js               夸克网盘接口（列目录/建目录/分片上传）+ zip 打包
public/index.html      单页前端
bin/                   yt-dlp、ffmpeg（不提交到仓库）
deploy/                systemd、部署脚本、文档生成脚本
android/               Android WebView 壳源码
使用说明.docx           买家使用文档（便携包）
```

## 线上部署

服务器要求：Linux、Node 18+、Playwright Chromium、ffmpeg。仓库提供 systemd 服务文件和 GitHub Actions 工作流。

### 1. 准备服务器

```bash
mkdir -p /opt/douyin-tool
cd /opt/douyin-tool
npm install --omit=dev
npx playwright install chromium
# 安装 Chromium 系统依赖（RHEL / OpenCloudOS 示例）
dnf install -y nss atk at-spi2-atk cups-libs libXcomposite libXdamage libXrandr \
  mesa-libgbm libxkbcommon alsa-lib pango cairo libdrm libX11 libXext libXfixes \
  libxcb libXrender libXScrnSaver gtk3 libsecret
```

### 2. 配置 systemd

```bash
cp deploy/douyin-tool.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now douyin-tool
```

### 3. 开放端口
安全组放行 `3210/TCP`（以及部署用的 `22/TCP`）。

### 4. GitHub Actions
在仓库 Settings → Secrets and variables → Actions 添加：

| Secret | 说明 |
|---|---|
| `SSH_HOST` | 服务器 IP |
| `SSH_USER` | SSH 用户 |
| `SSH_PRIVATE_KEY` | 服务器私钥全文 |

push 到 `main` 后自动上传代码并重启服务。

## Android APK

```bash
cd android
./gradlew assembleDebug
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`

APK 为独立媒体嗅探版：App 内打开页面，播放/滚动后捕获媒体，点击下载到手机 Downloads。不支持 YouTube 的 m3u8 分离流；主页批量依赖滚动捕获。

## 常见问题

**抓取 0 条？** 确认已登录、网络正常；平台风控时稍后再试。  
**下载失败？** 检查网络、磁盘空间、清晰度；工具会自动重试。  
**动态图不动？** 抖音图集的动态效果在 `_live.mp4`，webp 是静态封面。  
**手机打不开？** 同一 WiFi、token 正确、防火墙允许 node.exe。  
**会不会封号？** 批量下载有风险，建议小号并开启安全模式，工具不能保证不封号。

## 免责声明

本工具仅用于个人学习、备份已公开内容。请遵守抖音及各平台用户协议，不要用于商业用途、二次传播、绕过付费或私密内容。批量下载可能导致账号限流或封禁，风险由使用者承担。工具不收集、不上传任何账号信息，cookies 仅保存在本机。
