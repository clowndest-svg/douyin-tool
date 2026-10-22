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
  children: [new TextRun({ text: '使用说明  ·  版本 1.3  ·  2026-10-22', font: FONT, size: 20, color: '666666' })],
}));

children.push(h('一、这是什么'));
children.push(text('这是一个免安装的本地视频/图集下载工具，支持：'));
children.push(li('抖音主页批量下载（按抖音号）'));
children.push(li('通用链接下载：YouTube、TikTok、X（Twitter）、小红书等 yt-dlp 支持的站点'));
children.push(li('视频、图集、Live Photo 动态照片'));
children.push(li('清晰度选择、安全模式、手机访问、文件预览'));
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

children.push(h('四、下载抖音主页作品'));
children.push(li('平台选择「抖音主页（按抖音号）」。'));
children.push(li('输入抖音号（例如 36200424545），点「获取视频」。'));
children.push(li('列表包含：#、封面、标题、类型、发布时间、时长、点赞、评论、状态。'));
children.push(li('类型说明：视频 / 图片×N / 动态图×N（Live Photo）/ 混合×N。'));
children.push(li('勾选作品后点「下载所选」或「下载全部」。'));
children.push(li('已下载的作品会显示「已下载」，重复下载会自动跳过。'));

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
children.push(li('页面可以直接输入路径，或点「选择目录」在电脑上选择。'));
children.push(li('下载完成后可以在「已下载文件」里预览或下载到手机。'));

children.push(h('九、手机访问'));
children.push(li('手机和电脑连接同一个 WiFi。'));
children.push(li('页面「手机访问」一栏会显示地址，例如 http://192.168.1.10:3210/?token=xxxx 。'));
children.push(li('点「复制地址」，发到手机浏览器打开。'));
children.push(li('token 保存在工具目录的 token.txt，修改后重启工具生效。'));
children.push(li('手机页面可以控制下载、预览文件、把文件下载到手机。'));
children.push(li('手机打不开：检查同一 WiFi、Windows 防火墙允许 node.exe、token 是否正确。'));

children.push(h('十、其他功能'));
children.push(li('文件列表：视频/图片在线预览、下载到手机。'));
children.push(li('导出列表 CSV：方便做表格。'));
children.push(li('一键更新 yt-dlp。'));
children.push(li('跳过已下载、失败自动重试、下载字节进度。'));

children.push(h('十一、常见问题'));
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

children.push(h('十二、免责声明'));
children.push(text('本工具仅用于个人学习、备份已公开内容。请遵守抖音及各平台的用户协议，不要用于商业用途、二次传播、绕过付费或私密内容。批量下载可能导致账号限流或封禁，风险由使用者承担。工具不收集、不上传任何账号信息，cookies 仅保存在本机。'));

children.push(h('版本记录'));
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
    '5. 输入抖音号 → 获取视频 → 勾选 → 下载',
    '',
    '手机访问：http://电脑IP:3210/?token=见 token.txt',
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
