package com.local.douyintool;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private WebView webView;
    private boolean intentHandled = false;
    private EditText urlInput;
    private TextView statusText;
    private LinearLayout sniffBar;
    private CheckBox onlineModeBox;
    private SharedPreferences prefs;

    private final Set<String> mediaUrls = new LinkedHashSet<>();
    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s，。；]+");
    private static final String DEFAULT_ONLINE = "http://124.220.54.64:3210/?token=61f4c5b6";
    private static final String DEFAULT_INDEPENDENT = "https://www.douyin.com/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("douyin_tool", Context.MODE_PRIVATE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setPadding(10, 10, 10, 6);

        onlineModeBox = new CheckBox(this);
        onlineModeBox.setText("在线");
        onlineModeBox.setChecked(prefs.getBoolean("online", true));
        bar.addView(onlineModeBox);

        urlInput = new EditText(this);
        urlInput.setSingleLine(true);
        urlInput.setHint("服务器地址或作品链接");
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        bar.addView(urlInput, lp);

        Button paste = new Button(this);
        paste.setText("粘贴");
        paste.setOnClickListener(v -> pasteFromClipboard());
        bar.addView(paste);

        Button open = new Button(this);
        open.setText("打开");
        open.setOnClickListener(v -> openInput());
        bar.addView(open);

        root.addView(bar);

        sniffBar = new LinearLayout(this);
        sniffBar.setOrientation(LinearLayout.HORIZONTAL);
        sniffBar.setPadding(12, 4, 12, 4);

        statusText = new TextView(this);
        statusText.setText("捕获 0 个媒体（播放/滚动后自动捕获）");
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        sniffBar.addView(statusText, slp);

        Button downloadAll = new Button(this);
        downloadAll.setText("下载全部");
        downloadAll.setOnClickListener(v -> downloadAll());
        sniffBar.addView(downloadAll);

        Button clear = new Button(this);
        clear.setText("清空");
        clear.setOnClickListener(v -> {
            synchronized (mediaUrls) {
                mediaUrls.clear();
            }
            updateStatus();
        });
        sniffBar.addView(clear);

        root.addView(sniffBar);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!onlineModeBox.isChecked()) {
                    String scheme = request.getUrl().getScheme();
                    if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                        return super.shouldInterceptRequest(view, request);
                    }
                    captureUrl(request.getUrl().toString());
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                if (scheme.equals("http") || scheme.equals("https")) {
                    return false;
                }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && error != null) {
                    // 主框架错误保留系统提示；子资源错误忽略
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            android.util.Log.i("DouyinTool", "download-listener url=" + url + " mime=" + mimetype + " len=" + contentLength);
            if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                downloadFile(url, userAgent, contentDisposition, mimetype);
            } else {
                Toast.makeText(this, "不支持的下载链接", Toast.LENGTH_SHORT).show();
            }
        });

        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        setContentView(root);

        onlineModeBox.setOnCheckedChangeListener((buttonView, isChecked) -> {
            prefs.edit().putBoolean("online", isChecked).apply();
            updateModeUI();
            String target = isChecked ? DEFAULT_ONLINE : DEFAULT_INDEPENDENT;
            urlInput.setText(target);
            webView.loadUrl(target);
        });

        String saved = prefs.getString("url", onlineModeBox.isChecked() ? DEFAULT_ONLINE : DEFAULT_INDEPENDENT);
        urlInput.setText(saved);
        updateModeUI();

        handleIntent(getIntent());
        // loadUrl 是异步的，getUrl() 此刻仍为 null；不记录 intentHandled 的话分享进来的链接会被默认地址覆盖
        if (!intentHandled && webView.getUrl() == null) {
            webView.loadUrl(saved);
        }
    }

    private void updateModeUI() {
        boolean online = onlineModeBox.isChecked();
        sniffBar.setVisibility(online ? View.GONE : View.VISIBLE);
        urlInput.setHint(online ? "服务器地址（含 token）" : "作品/主页链接");
    }

    private void handleIntent(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null) {
                Matcher m = URL_PATTERN.matcher(text);
                if (m.find()) {
                    urlInput.setText(m.group());
                    webView.loadUrl(m.group());
                    intentHandled = true;
                }
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void pasteFromClipboard() {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null && cm.hasPrimaryClip()) {
            ClipData clip = cm.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                CharSequence text = clip.getItemAt(0).coerceToText(this);
                Matcher m = URL_PATTERN.matcher(text);
                urlInput.setText(m.find() ? m.group() : text);
            }
        }
    }

    private void openInput() {
        String url = urlInput.getText().toString().trim();
        if (url.isEmpty()) {
            Toast.makeText(this, "请输入地址或链接", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        prefs.edit().putString("url", url).apply();
        webView.loadUrl(url);
    }

    private void captureUrl(String url) {
        if (url == null) return;
        String lower = url.toLowerCase();
        if (lower.contains(".m3u8")) return;
        boolean isMedia = lower.contains(".mp4") || lower.contains(".webp") || lower.contains(".gif")
                || lower.contains(".jpg") || lower.contains(".jpeg") || lower.contains(".png");
        if (!isMedia) return;
        if (lower.contains("avatar") || lower.contains("icon") || lower.contains("logo")
                || lower.contains("emoji") || lower.contains("sprite")) return;
        synchronized (mediaUrls) {
            if (mediaUrls.size() >= 300) return;
            mediaUrls.add(url);
        }
        runOnUiThread(this::updateStatus);
    }

    private void updateStatus() {
        statusText.setText("捕获 " + mediaUrls.size() + " 个媒体（播放/滚动后自动捕获）");
    }

    private void downloadAll() {
        Set<String> urls;
        synchronized (mediaUrls) {
            urls = new LinkedHashSet<>(mediaUrls);
        }
        if (urls.isEmpty()) {
            Toast.makeText(this, "还没捕获到媒体，先播放或滚动页面", Toast.LENGTH_SHORT).show();
            return;
        }
        for (String url : urls) {
            downloadFile(url, webView.getSettings().getUserAgentString());
        }
        Toast.makeText(this, "已开始下载 " + urls.size() + " 个文件，视频进相册 DCIM/抖音下载器", Toast.LENGTH_LONG).show();
    }

    private void downloadFile(String url, String ua) {
        downloadFile(url, ua, null, null);
    }

    private void downloadFile(String url, String ua, String contentDisposition, String mimetype) {
        new Thread(new FetchTask(url, ua, contentDisposition, mimetype)).start();
    }

    // 自己取流写媒体库，不依赖 DownloadManager（部分 ROM/模拟器根本没有这个服务）
    private class FetchTask implements Runnable {
        private final String url;
        private final String ua;
        private final String contentDisposition;
        private final String mimetype;

        FetchTask(String url, String ua, String contentDisposition, String mimetype) {
            this.url = url;
            this.ua = ua;
            this.contentDisposition = contentDisposition;
            this.mimetype = mimetype;
        }

        @Override
        public void run() {
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(120000);
                conn.setRequestProperty("User-Agent", ua == null ? "Mozilla/5.0" : ua);
                String lower = url.toLowerCase();
                if (lower.contains("douyin")) {
                    conn.setRequestProperty("Referer", "https://www.douyin.com/");
                } else if (lower.contains("xiaohongshu") || lower.contains("xhscdn")) {
                    conn.setRequestProperty("Referer", "https://www.xiaohongshu.com/");
                } else if (lower.contains("tiktok") || lower.contains("tiktokcdn")) {
                    conn.setRequestProperty("Referer", "https://www.tiktok.com/");
                }
                String ck = CookieManager.getInstance().getCookie(url);
                if (ck != null && !ck.isEmpty()) conn.setRequestProperty("Cookie", ck);
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
                String contentType = conn.getContentType() != null ? conn.getContentType() : mimetype;
                String name = safeName(URLUtil.guessFileName(url, contentDisposition, contentType));
                String dir = albumDir(contentType, name);
                InputStream in = conn.getInputStream();
                long written;
                if (Build.VERSION.SDK_INT >= 29) {
                    written = writeViaMediaStore(in, name, contentType, dir);
                } else {
                    written = writeViaPublicDir(in, name, dir);
                }
                in.close();
                final String ok = "已存到 " + dir + "/" + name + "（" + Math.max(1, written / 1024) + " KB），相册可见";
                android.util.Log.i("DouyinTool", "saved " + dir + "/" + name + " bytes=" + written);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, ok, Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                final String err = e.getMessage() == null ? e.toString() : e.getMessage();
                android.util.Log.e("DouyinTool", "save-failed " + url + " -> " + err, e);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "保存失败：" + err, Toast.LENGTH_LONG).show());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }
    }

    private long writeViaMediaStore(InputStream in, String name, String contentType, String relDir) throws Exception {
        ContentValues cv = new ContentValues();
        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        cv.put(MediaStore.MediaColumns.MIME_TYPE, mimeOf(contentType, name));
        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, relDir);
        cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = getContentResolver().insert(collectionFor(relDir), cv);
        if (uri == null) throw new Exception("媒体库拒绝创建条目");
        OutputStream os = getContentResolver().openOutputStream(uri);
        long n = pump(in, os);
        cv.clear();
        cv.put(MediaStore.MediaColumns.IS_PENDING, 0);
        getContentResolver().update(uri, cv, null, null);
        return n;
    }

    @SuppressWarnings("deprecation")
    private long writeViaPublicDir(InputStream in, String name, String relDir) throws Exception {
        int slash = relDir.indexOf('/');
        String top = slash > 0 ? relDir.substring(0, slash) : relDir;
        String sub = slash > 0 ? relDir.substring(slash + 1) : "";
        File dir = Environment.getExternalStoragePublicDirectory(top);
        if (!sub.isEmpty()) dir = new File(dir, sub);
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("无法创建目录 " + dir);
        File out = new File(dir, name);
        long n = pump(in, new FileOutputStream(out));
        sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(out)));
        return n;
    }

    private static long pump(InputStream in, OutputStream out) throws Exception {
        if (out == null) throw new Exception("无法打开输出流");
        byte[] buf = new byte[64 * 1024];
        long total = 0;
        int r;
        try {
            while ((r = in.read(buf)) > 0) {
                out.write(buf, 0, r);
                total += r;
            }
        } finally {
            out.flush();
            out.close();
        }
        return total;
    }

    // 视频进 DCIM、图片进 Pictures，相册才扫得到；其余落 Download
    private static String albumDir(String contentType, String name) {
        String mt = contentType == null ? "" : contentType.toLowerCase();
        String n = name == null ? "" : name.toLowerCase();
        if (mt.startsWith("video") || n.endsWith(".mp4") || n.endsWith(".mov") || n.endsWith(".m4v")) {
            return "DCIM/抖音下载器";
        }
        if (mt.startsWith("image") || n.endsWith(".webp") || n.endsWith(".jpg") || n.endsWith(".jpeg")
                || n.endsWith(".png") || n.endsWith(".gif")) {
            return "Pictures/抖音下载器";
        }
        if (mt.startsWith("audio") || n.endsWith(".mp3") || n.endsWith(".m4a")) {
            return "Music/抖音下载器";
        }
        return "Download/抖音下载器";
    }

    private static Uri collectionFor(String relDir) {
        if (relDir.startsWith("DCIM")) return MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
        if (relDir.startsWith("Pictures")) return MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
        if (relDir.startsWith("Music")) return MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        return MediaStore.Files.getContentUri("external");
    }

    private static String mimeOf(String contentType, String name) {
        if (contentType != null && !contentType.contains("octet-stream")) {
            int cut = contentType.indexOf(';');
            return (cut > 0 ? contentType.substring(0, cut) : contentType).trim();
        }
        String ext = name != null && name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
        String guessed = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        return guessed != null ? guessed : "application/octet-stream";
    }

    private static String safeName(String raw) {
        if (raw == null || raw.trim().isEmpty()) return "media_" + System.currentTimeMillis() + ".mp4";
        String s = raw.trim().replaceAll("[\\\\/:*?\"<>|]", "_");
        return s.length() > 80 ? s.substring(s.length() - 80) : s;
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
