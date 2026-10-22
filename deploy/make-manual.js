const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const FONT = '微软雅黑';
const OUT_DOC = 'D:\\视频\\douyin-tool\\使用说明.docx';
const PORTABLE = 'D:\\视频\\douyin-tool-portable';

function text(t, opts = {}) {
  return new Paragraph({
    spacing: { after: 100, line: 300 },
    ...opts,
    children: [new TextRun({ text: t, font: FONT, size: opts.size || 22, bold: opts.bold, color: opts.color })],
  });
}
function h(t) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text: t, font: FONT, size: 28, bold: true, color: '1F4E79' })],
  });
}
function li(t) {
  return new Paragraph({
    spacing: { after: 60, line: 300 },
    bullet: { level: 0 },
    children: [new TextRun({ text: t, font: FONT, size: 22 })],
  });
}

const children = [];
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({ text: '抖音 / 多平台视频下载器', font: FONT, size: 44, bold: true, color: '1F4E79' })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 320 },
  children: [new TextRun({ text: '使用说明  ·  版本 1.7  ·  2026-10-22', font: FONT, size: 20, color: '666666' })],
}));

children.push(h('一、这是什么'));
children.push(text('这是一个免安装的本地视频/图集下载工具，支持：'));
children.push(li('抖音主页批量下载（按抖音号）'));
children.push(li('通用链接下载：YouTube、TikTok、X（Twitter）、小红书等 yt-dlp 支持的站点'));
children.push(li('视频、图集、Live Photo 动态照片'));
children.push(li('清晰度选择、安全模式、手机访问、文件预览'));
children.push(li('下载去向三选一：存电脑、存手机相册（App）、传夸克网盘（可指定网盘目录）'));
children.push(li('勾选文件打包成 zip，一次上传到网盘指定位置'));
children.push(text('所有数据保存在你自己的电脑上，工具不会上传账号信息。'));

children.push(h('二、解压与启动'));
children.push(li('把压缩包解压到任意目录（建议路径不含特殊字符）。'));
children.push(li('双击「启动工具.bat」，会自动打开浏览器 http://127.0.0.1:3210 。'));
children.push(li('也可以双击「启动工具-静默.vbs」，不显示命令行窗口。'));
children.push(li('首次启动稍慢，等待页面出现即可。'));
children.push(li('关闭工具：在任务管理器结束 node.exe，或直接关机。'));

children.push(h('三、首次登录抖音'));
children.push(li('页面顶部显示「未登录」时，在页面内扫码或使用验证码登录（推荐验证码）。'));
children.push(li('登录成功的标志：页面显示「已登录抖音」，浏览器右上角出现你的头像。'));
children.push(li('登录态保存在工具目录的 profile 文件夹，下次启动不用重复登录。'));
children.push(li('二维码过期时，点「刷新二维码」重新生成。'));
children.push(li('工具会在使用结束后 5 分钟自动关闭后台浏览器以省内存，登录态不会丢，下次要用时自动重开。'));
children.push(li('线上版（服务器）常拿不到二维码：抖音对云服务器 IP 不返回码图，验证码也常被风控拦下。'));
children.push(li('正确做法：在本机版登录一次 → 在登录区填线上完整地址（含 ?token=）→ 点「把本机登录态同步过去」，线上即刻可用，不用在线上再登录。'));
children.push(li('同步走的是普通 HTTP，登录态等于账号钥匙，只在自己掌控的服务器之间用；不要往陌生地址点。'));

children.push(h('四、下载抖音主页作品'));
children.push(li('平台选择「抖音主页（按抖音号）」。'));
children.push(li('输入抖音号（例如 36200424545），点「获取视频」。'));
children.push(li('列表包含：#、封面、标题、类型、发布时间、时长、点赞、评论、状态。'));
children.push(li('类型说明：视频 / 图片×N / 动态图×N（Live Photo）/ 混合×N。'));
children.push(li('勾选想要的作品，然后在「导出方案」里一次把话说清楚，再点「开始导出」：内容类型（图片 / 动态图 / 视频，可多选）、保存到（电脑 / 手机相册 / 夸克网盘）、是否合成一个压缩包。'));
children.push(li('不需要先下载到服务器再去文件列表里二次勾选——类型和去向在导出前就定好，一步到位。'));
children.push(li('文件按类型分三个子文件夹存：博主昵称/图片（图集静态图）、博主昵称/动态图（Live Photo 的 mp4）、博主昵称/视频（普通视频）；打包时压缩包内也保留这三个分类。'));
children.push(li('已下载的作品会显示「已下载」，重复下载会自动跳过（旧版平铺存放的文件也能认出来，不会重复下一遍）。'));

children.push(h('五、通用链接下载（YouTube / TikTok / X / 小红书）'));
children.push(li('平台选择「通用链接」。'));
children.push(li('粘贴作品链接或主页链接，例如 https://www.youtube.com/@频道 。'));
children.push(li('点「获取视频」，工具会用 yt-dlp 解析列表。'));
children.push(li('选择清晰度：最佳 / 4K / 1080p / 720p / 480p / 360p / 仅音频。'));
children.push(li('勾选后下载，文件保存到「下载目录/平台/标题/」下。'));
children.push(li('需要登录的内容（TikTok/X/小红书）：先在工具浏览器里登录对应平台，并保持「使用浏览器 cookies」开启。'));

children.push(h('六、关于清晰度'));
children.push(li('清晰度只对通用链接生效；抖音作品使用原始地址。'));
children.push(li('4K/1080p 需要 ffmpeg 合并音视频，便携包已内置。'));
children.push(li('清晰度越高文件越大；「仅音频」保存为 m4a。'));

children.push(h('七、安全模式（防封，推荐开启）'));
children.push(li('默认开启：单批 20 条、每条随机 3~8 秒、批间 60 秒、每日上限 200 条。'));
children.push(li('连续失败 3 次会自动暂停 5 分钟。'));
children.push(li('可以关闭，但风险自担。'));
children.push(li('批量下载有账号限流/封禁风险，建议使用小号，控制下载数量。'));

children.push(h('八、保存目录'));
children.push(li('默认保存到 D:\\视频 。'));
children.push(li('每个博主一个文件夹，里面再按 图片 / 动态图 / 视频 三个子文件夹分类。'));
children.push(li('页面可以直接输入路径，也可以点「选择目录」在页面里逐层进入本机文件夹后选定（服务器上同样能用，不依赖系统弹窗）。'));
children.push(li('下载完成后可以在「已下载文件」里预览或下载到手机。'));

children.push(h('九、手机访问'));
children.push(li('手机和电脑连接同一个 WiFi。'));
children.push(li('页面「手机访问」一栏会显示地址，例如 http://192.168.1.10:3210/?token=xxxx 。'));
children.push(li('点「复制地址」，发到手机浏览器打开；或直接安装本包内的「抖音下载器-独立版.apk」，在 App 里填同一个地址。'));
children.push(li('用线上地址访问时，这一栏显示的就是线上地址本身（服务器没有局域网），手机直接扫/输这个地址即可。'));
children.push(li('浏览器在非 HTTPS 页面会禁止脚本读剪贴板，工具会自动改用兼容方式复制；个别浏览器仍会拦，届时手动复制页面上显示的那行地址。'));
children.push(li('token 保存在工具目录的 token.txt，修改后重启工具生效。'));
children.push(li('手机页面可以控制下载、预览文件、把文件保存到手机。'));
children.push(li('手机打不开：检查同一 WiFi、Windows 防火墙允许 node.exe、token 是否正确。'));

children.push(h('十、导出方案：类型 / 去向 / 打包'));
children.push(li('勾选作品后，列表上方就是「导出方案」卡片，四件事在这里一次定完，点「开始导出」直接执行。'));
children.push(li('内容类型：图片 / 动态图 / 视频 三个开关（至少留一个）。只要动态图就只下动态图，不会顺手把静态图也下一遍。'));
children.push(li('保存到 · 电脑：存到你选的目录（点「更换目录」在页面里逐层选，服务器上也一样能用）。'));
children.push(li('保存到 · 手机相册：电脑/服务器先把文件下好，再由本机浏览器逐个拉回。用 App 打开的直接写进相册——视频进 DCIM/抖音下载器，图片进 Pictures/抖音下载器；用手机浏览器打开的只能落在浏览器下载目录（浏览器权限限制，App 才能进相册）。'));
children.push(li('保存到 · 夸克网盘：下完后自动上传到你指定的网盘目录。没连接或没填目录时「开始导出」按钮是灰的，并写明原因，不会假装成功。'));
children.push(li('合成一个压缩包：勾上后本次产出会打成一个 zip（内部仍按 图片/动态图/视频 分类），电脑模式得到 zip，网盘模式直接传这个 zip，手机模式则下载这个 zip（zip 不是照片，不会进相册）。'));
children.push(li('下载进度和上传进度各一张卡片，带百分比、当前文件、本文件字节进度；日志默认折叠，点「查看运行日志」展开。'));
children.push(li('任务跑起来后，「开始导出」旁边会出现红色「停止导出」按钮：点一下会在做完当前这一条后停下（不会撕出半截文件），状态显示「正在停止…」，网盘上传队列同样会被叫停。'));
children.push(li('网盘上传走的是官方秒传通道：云端已有完全相同内容时不再重复上传流量，日志会标注「秒传」。上传后工具会在网盘目录里回查确认，网盘索引偶尔慢几秒，工具会自动重试，仍看不到时按「已受理」提示你去网盘核对，不会谎报成功或失败。'));
children.push(li('「历史文件」面板折叠在页面底部，用于对以前下过的东西单独打包、补传或预览，主流程用不到它。'));
children.push(text('为什么线上页面不能直接写进我电脑的任意文件夹？', { bold: true }));
children.push(text('这是浏览器的安全规则，不是工具缺陷：远程网页默认没有你本机文件系统的写入权限，只有本机版（localhost）或 HTTPS 站点才允许调用「选择文件夹并直接写入」。所以从线上页面看，「服务器目录」指的是远程那台机器的硬盘。'));
children.push(text('要把文件落到你自己电脑，有三条路：'));
children.push(li('① 用本机版（解压后双击「启动工具.bat」）：选「电脑」，点「浏览目录」会弹出系统原生的选择文件夹窗口，选好就直接写进去；也可以点「选本机文件夹，直接写入」由页面直接落盘。'));
children.push(li('② 线上页面选「下载到本机」：服务器负责抓取和打包，做完由浏览器把文件（或一个 zip）下载下来。想每次都自己挑位置，就在浏览器设置里打开「下载前询问每个文件的保存位置」，会弹出系统另存为窗口。'));
children.push(li('③ 线上页面若配了 HTTPS 域名，也能用「选本机文件夹，直接写入」，效果同本机版。'));

children.push(h('十一、连接夸克网盘与打包上传'));
children.push(li('页面「夸克网盘」面板点开展开设置，状态会如实显示「已连接」或「未连接」。'));
children.push(li('连接方式一（推荐，服务器上也一样能用）：点「显示登录二维码」→ 用手机「夸克网盘 App」或「夸克 App」的扫一扫 → 在手机上点确认。页面会自动检测到登录并导入，不需要你再点别的；二维码过期点「换一张码」。'));
children.push(li('连接方式二（任何环境都能用）：自己在电脑浏览器登录 pan.quark.cn → 按 F12 → Network → 找一条 drive-pc.quark.cn 的请求 → 复制请求头里整串 Cookie → 粘贴到工具里点「保存并测试 Cookie」。'));
children.push(li('Cookie 保存前工具会先向夸克校验，校验不过不会保存，界面会显示原因（例如 Cookie 已失效）。'));
children.push(li('指定网盘路径：直接输入例如 /影视/抖音，或点「浏览目录」一层层进入后「选定当前目录」，需要时可在里面新建文件夹。'));
children.push(li('下载时选「夸克网盘」→ 下载完成后自动上传到「该路径/博主昵称」下，进度和结果写在面板的「上传进度」日志里。'));
children.push(li('打包成压缩包：在「已下载文件」勾选若干文件 → 点「打包成压缩包」→ 生成在 下载目录/_压缩包/ 下；再勾选这个 zip 点「上传所选到夸克网盘」即可一次传一个整包。'));
children.push(li('上传走夸克官方网页同一套接口，超过 4MB 自动分片；云端已有完全相同文件时会被秒传，日志会标注。'));
children.push(li('Cookie 只保存在本机 config.json（便携包解压目录内），不会随工具发给别人；换电脑需重新粘贴。'));
children.push(li('注意：这是夸克网页版使用的接口，官方没有公开文档，若夸克改版可能失效；届时工具会把失败原因显示在日志里，文件仍安全留在电脑。'));

children.push(h('十二、其他功能'));
children.push(li('文件列表：视频/图片在线预览、下载到手机、勾选打包。'));
children.push(li('导出列表 CSV：方便做表格。'));
children.push(li('一键更新 yt-dlp。'));
children.push(li('跳过已下载、失败自动重试、下载字节进度。'));

children.push(h('十三、常见问题'));
children.push(text('Q1：页面打不开？', { bold: true }));
children.push(text('双击「启动工具.bat」；检查 3210 端口是否被占用；看命令行窗口的报错。'));
children.push(text('Q2：登录失败？', { bold: true }));
children.push(text('换验证码登录；二维码过期点刷新；确认手机抖音上已点确认。'));
children.push(text('Q3：抓取返回 0 条？', { bold: true }));
children.push(text('确认已登录；重新获取；可能是网络或平台风控，稍后再试。'));
children.push(text('Q4：下载失败？', { bold: true }));
children.push(text('检查网络、磁盘空间、清晰度设置；工具会自动重试。'));
children.push(text('Q5：动态图下载后不动？', { bold: true }));
children.push(text('抖音图集的动态效果在 _live.mp4 文件里，webp 是静态封面；播放 mp4 即可。'));
children.push(text('Q6：手机打不开？', { bold: true }));
children.push(text('确认手机和电脑同一 WiFi、token 正确、Windows 防火墙允许 node.exe。'));
children.push(text('Q7：杀毒软件报毒？', { bold: true }));
children.push(text('工具未做签名，纯本地运行；可以添加信任，或检查源码后再用。'));
children.push(text('Q8：会不会封号？', { bold: true }));
children.push(text('批量下载有风险。建议用小号、开启安全模式、控制数量；工具不能保证不封号。'));
children.push(text('Q9：夸克网盘显示未连接 / 上传失败？', { bold: true }));
children.push(text('先看面板日志的具体原因。常见三种：Cookie 过期（重新登录再粘贴一次）、路径写成了网盘里不存在的目录（工具会自动创建，但名字里有特殊字符时建议换个名）、夸克侧风控或空间不足。上传失败时文件仍在电脑下载目录里，不会丢。'));
children.push(text('Q10：手机上相册里找不到下载的文件？', { bold: true }));
children.push(text('用 App 打开的会进 DCIM/抖音下载器（视频）和 Pictures/抖音下载器（图片），相册一般立刻能看到，个别手机要等媒体库扫描或重启相册；用手机浏览器打开的落在浏览器下载目录，需要相册 App 里手动找「下载」分类。压缩包（zip）不属于照片，会落在下载目录。'));

children.push(text('Q11：线上（服务器）扫码区显示的不是二维码 / 验证码点了没反应？', { bold: true }));
children.push(text('这是云服务器 IP 被抖音风控：页面能打开但不下发码图，验证码接口也会被拦。工具现在会直接写明"抖音没给这台服务器返回二维码图片"，而不是给你一张没码的图。解决办法就是用本机登录一次，再点「把本机登录态同步过去」。另外若服务器内存吃紧把浏览器杀了，也会造成弹窗半渲染——工具已改为空闲 5 分钟自动关浏览器，服务器内存上限也放宽了。'));

children.push(h('十四、免责声明'));
children.push(text('本工具仅用于个人学习、备份已公开内容。请遵守抖音及各平台的用户协议，不要用于商业用途、二次传播、绕过付费或私密内容。批量下载可能导致账号限流或封禁，风险由使用者承担。工具不收集、不上传任何账号信息，cookies 仅保存在本机。'));

children.push(h('版本记录'));
children.push(li('1.7：导出方案卡片（导出前就选内容类型 / 去向 / 是否打包，一步到位）；下载与上传进度改为带动画的进度卡；「选择目录」改为页面内浏览（服务器上也能用）；非 HTTPS 下复制地址加兜底。'));
children.push(li('1.6：夸克网盘连接/指定路径上传/打包 zip 上传；下载去向电脑·手机相册·网盘三选一；App 直接写相册（不再依赖系统下载服务）。'));
children.push(li('1.4~1.5：App 双模式（在线 = 网页功能一致）、修复 bytedance 协议跳转、应用图标。'));
children.push(li('1.3：清晰度选择、cookies、1080p/4K 合并、多平台、安全模式、手机访问、独立 APK。'));
children.push(li('1.2：列表增加类型/评论/状态列。'));
children.push(li('1.1：独立版 APK（媒体嗅探）。'));

(async () => {
  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT_DOC, buf);
  fs.mkdirSync(PORTABLE, { recursive: true });
  fs.writeFileSync(path.join(PORTABLE, '使用说明.docx'), buf);

  const quick = [
    '抖音 / 多平台视频下载器 快速开始',
    '',
    '1. 解压到任意目录',
    '2. 双击「启动工具.bat」',
    '3. 浏览器打开 http://127.0.0.1:3210',
    '4. 在页面内登录抖音（扫码或验证码）',
    '5. 输入抖音号 → 获取视频 → 勾选 → 在「导出方案」里选类型/去向/是否打包 → 开始导出',
    '6. 想传夸克网盘：在「夸克网盘」面板连接一次，之后下载会自动上传到指定网盘目录',
    '',
    '手机访问：http://电脑IP:3210/?token=见 token.txt（或直接装「抖音下载器-独立版.apk」）',
    '详细说明见「使用说明.docx」',
    '',
    '提示：批量下载有封号风险，建议用小号并保持安全模式开启。',
  ].join('\r\n');
  fs.writeFileSync(path.join(PORTABLE, '快速开始.txt'), quick, 'utf8');

  const tokenFile = path.join(PORTABLE, 'token.txt');
  if (!fs.existsSync(tokenFile)) {
    const token = 'dy-' + require('crypto').randomBytes(4).toString('hex');
    fs.writeFileSync(tokenFile, token, 'utf8');
  }
  console.log('DOC_OK ' + OUT_DOC);
  console.log('PORTABLE_OK ' + PORTABLE);
})();
