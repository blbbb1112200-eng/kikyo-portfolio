# Bulinbin Portfolio

独立个人作品集网站预览版。当前先验证两部分：

- 首屏滚动个人定位：随着页面滚动切换 UI 设计、AI 产品设计、AIGC 视觉、Vibe Coding 和个人档案。
- 第二屏个人档案：左侧拍立得照片轮播，右侧中文个人介绍、求职方向、经历结构和技能能力。

## 本地预览

直接打开 `index.html`，或在本目录启动一个本地服务。因为首屏视频需要被滚动条拖动时间轴，推荐使用这个预览服务：

```bash
node local-preview-server.mjs
```

访问：

```text
http://127.0.0.1:5190
```

也可以用普通静态服务查看基础页面，但它可能不支持视频拖动：

```bash
python3 -m http.server 5188
```

访问：

```text
http://localhost:5188
```

## 替换素材

- 首页视频：替换 `assets/hero-character.mp4`
- 拍立得相框：替换 `assets/polaroid-frame-placeholder.jpg`
- 三张照片：替换 `assets/photo-placeholder-1.png`、`assets/photo-placeholder-2.png`、`assets/photo-placeholder-3.jpg`
