package com.local.douyintool;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
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

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private WebView webView;
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
            if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                downloadFile(url, userAgent);
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
        if (webView.getUrl() == null) {
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
        Toast.makeText(this, "已开始下载 " + urls.size() + " 个文件到手机 Downloads", Toast.LENGTH_LONG).show();
    }

    private void downloadFile(String url, String ua) {
        try {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            String lower = url.toLowerCase();
            if (lower.contains("douyin")) {
                req.addRequestHeader("Referer", "https://www.douyin.com/");
            } else if (lower.contains("xiaohongshu") || lower.contains("xhscdn")) {
                req.addRequestHeader("Referer", "https://www.xiaohongshu.com/");
            } else if (lower.contains("tiktok") || lower.contains("tiktokcdn")) {
                req.addRequestHeader("Referer", "https://www.tiktok.com/");
            }
            if (ua != null) req.addRequestHeader("User-Agent", ua);
            String fileName = URLUtil.guessFileName(url, null, null);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            dm.enqueue(req);
        } catch (Exception e) {
            Toast.makeText(this, "下载失败: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
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
