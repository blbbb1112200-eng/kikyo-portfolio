import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";

const projectRoot = "/Users/kikyo/Documents/vibe coding-test/personal-portfolio-site";
const indexHtml = readFileSync(`${projectRoot}/index.html`, "utf8");
const appJs = readFileSync(`${projectRoot}/app.js`, "utf8");
const stylesCss = readFileSync(`${projectRoot}/styles.css`, "utf8");

test("intro uses a galaxy prompt instead of the old enter button copy", () => {
  assert.match(indexHtml, /intro-galaxy-canvas/);
  assert.match(indexHtml, /Tap anywhere to begin/i);
  assert.doesNotMatch(indexHtml, /ENTER \/ SOUND ON/);
  assert.doesNotMatch(indexHtml, /点击后开场动画和 BGM 一起开始/);
});

test("hero and header copy use the new English naming system", () => {
  for (const label of [
    "Creative Design",
    "UX/UI Design",
    "AI Experience",
    "AI Workflow",
    "Visual Lab",
    "Digital Human",
    "KIKYO",
    "PORTFOLIO"
  ]) {
    assert.match(indexHtml, new RegExp(label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
  }

  for (const removed of [
    "用角色视觉，把 UI、AI 与 AIGC 能力放进同一个作品现场。",
    "快速原型",
    "武林兵 2026 个人设计",
    "BULINBIN",
    "Interaction Design"
  ]) {
    assert.doesNotMatch(indexHtml, new RegExp(removed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
  }
});

test("works section lists projects directly without a category drawer", () => {
  for (const label of [
    "INDEX / ALL PROJECTS",
    "ALL PROJECTS",
    "以 UX 系统、AI 产品与视觉工作流，组织从问题定义到完整案例的设计证据。",
    "展开作品",
    "蓝领招工",
    "Emochi",
    "山海经",
    "能源网站",
    "数字人视频"
  ]) {
    assert.match(indexHtml, new RegExp(label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
  }

  assert.doesNotMatch(indexHtml, /OPEN CATEGORIES/);
  assert.doesNotMatch(indexHtml, /project-drawer/);
  assert.doesNotMatch(indexHtml, /data-category/);
  assert.doesNotMatch(appJs, /projectDrawer/);
  assert.doesNotMatch(stylesCss, /project-drawer/);
  assert.doesNotMatch(indexHtml, /data-project="vibe-coding"/);
  assert.doesNotMatch(indexHtml, /data-project="visual-lab"/);
  assert.match(indexHtml, /data-project="emochi"/);
  assert.match(indexHtml, /case-browser is-direct is-collapsed/);
  assert.match(appJs, /caseFolderTrigger/);
});

test("works cards use the provided Shanhaijing, energy website, and digital human assets", () => {
  assert.match(indexHtml, /data-project="shanhaijing"/);
  assert.match(indexHtml, /data-project="energy-website"/);
  assert.match(indexHtml, /data-project="digital-human"/);
  assert.match(indexHtml, /assets\/shanhaijing-cover\.jpg/);
  assert.match(indexHtml, /assets\/thumbs\/energy-website-cover\.jpg/);
  assert.match(indexHtml, /assets\/digital-human-cover\.jpg/);
  assert.match(appJs, /id: "shanhaijing"/);
  assert.match(appJs, /const shanhaijingCasePages = Array\.from/);
  assert.match(appJs, /pages: shanhaijingCasePages/);
  assert.doesNotMatch(appJs, /pdfSrc: "\.\/assets\/shanhaijing\.pdf"/);
  assert.match(appJs, /id: "energy-website"/);
  assert.match(appJs, /const energyWebsiteCasePages = Array\.from/);
  assert.match(appJs, /pages: energyWebsiteCasePages/);
  assert.match(appJs, /pdfSrc: "\.\/assets\/energy-website\.pdf"/);
  assert.match(appJs, /id: "digital-human"/);
  assert.match(appJs, /type: "video-carousel"/);
  assert.match(appJs, /const digitalHumanVideos = \[/);
  assert.match(appJs, /videoSources: digitalHumanVideos/);
  assert.match(appJs, /digital-human-videos\/digital-human-01\.mp4/);
  assert.match(appJs, /digital-human-videos\/digital-human-06\.mp4/);
  assert.doesNotMatch(appJs, /videoSrc: "\.\/assets\/digital-human-video\.mp4"/);
});

test("GitHub Pages build references only concrete assets that can be published", () => {
  const publishableAssets = new Set(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "assets"], { cwd: projectRoot, encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
  );
  const source = `${indexHtml}\n${appJs}\n${stylesCss}`;
  const references = new Set(
    Array.from(source.matchAll(/\.\/(assets\/[^"'`)>\s]+)/g), (match) => match[1])
      .filter((assetPath) => !assetPath.includes("${"))
  );

  for (const assetPath of references) {
    assert.equal(existsSync(`${projectRoot}/${assetPath}`), true, `${assetPath} exists locally`);
    assert.equal(publishableAssets.has(assetPath), true, `${assetPath} is publishable on Pages`);
  }
});

test("ability videos show poster frames before video data loads", () => {
  for (const [src, poster] of [
    ["./assets/ability-research-loop.mp4", "./assets/ability-research-poster.jpg"],
    ["./assets/ability-aigc-loop.mp4", "./assets/ability-aigc-poster.jpg"],
    ["./assets/ability-archive-magic-cards.mp4", "./assets/ability-archive-poster.jpg"]
  ]) {
    assert.match(
      indexHtml,
      new RegExp(`<video[^>]+src="${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]+poster="${poster.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`)
    );
    assert.equal(existsSync(`${projectRoot}/${poster.replace("./", "")}`), true, `${poster} exists`);
  }

  assert.doesNotMatch(indexHtml, /ability-[^"]+\.mp4"[^>]+preload="auto"/);
});

test("hero frame loading avoids downloading the full sequence on first load", () => {
  assert.doesNotMatch(appJs, /window\.setTimeout\(preloadAllFrames,\s*600\)/);
  assert.match(appJs, /preloadHeroScrollPath/);
});

test("hero scroll frames are quantized to reduce decode work while scrolling", () => {
  assert.match(appJs, /const fullMotionMode = new URLSearchParams/);
  assert.match(appJs, /const lightweightMode = !fullMotionMode \|\| window\.matchMedia/);
  assert.match(appJs, /const staticHeroMode = window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(appJs, /const heroFrameStep = lightweightMode \? 35 : 18/);
  assert.match(appJs, /function quantizeHeroFrame\(frameNumber\)/);
  assert.match(appJs, /const targetFrame = staticHeroMode \? heroFrameStart : quantizeHeroFrame\(rawTargetFrame\)/);
  assert.match(appJs, /if \(!staticHeroMode && heroFrame && targetFrame !== activeImageFrame\)/);
  assert.match(appJs, /Math\.round\(offset \/ heroFrameStep\) \* heroFrameStep/);
  assert.doesNotMatch(appJs, /centerFrame \+ 5/);
});

test("works intro includes a direct compressed portfolio pdf download", () => {
  assert.match(indexHtml, /class="works-download"/);
  assert.match(indexHtml, /href="\.\/assets\/kikyo-portfolio-2026\.pdf"/);
  assert.match(indexHtml, /download="KIKYO-Portfolio-2026\.pdf"/);
  assert.match(indexHtml, /下载完整作品集 PDF/);
  assert.match(stylesCss, /\.works-download\s*\{/);
  assert.equal(existsSync(`${projectRoot}/assets/kikyo-portfolio-2026.pdf`), true);
});

test("pdf case studies open as exported pages instead of the browser pdf viewer", () => {
  assert.match(indexHtml, /assets\/blue-collar-case\/page-01\.jpg/);
  assert.match(appJs, /const blueCollarCasePages = Array\.from\(\s*\{\s*length: 17\s*\}/);
  assert.match(appJs, /assets\/blue-collar-case\/page-/);
  assert.match(appJs, /id: "blue-collar"[\s\S]*?pages: blueCollarCasePages[\s\S]*?type: "case-pages"/);
  assert.doesNotMatch(appJs, /id: "blue-collar"[\s\S]*?type: "pdf"/);
  assert.match(appJs, /const shanhaijingCasePages = Array\.from\(\s*\{\s*length: 10\s*\}/);
  assert.match(appJs, /assets\/shanhaijing-case\/page-/);
  assert.match(appJs, /const energyWebsiteCasePages = Array\.from\(\s*\{\s*length: 12\s*\}/);
  assert.match(appJs, /assets\/energy-website-case\/page-/);
  assert.match(appJs, /id: "shanhaijing"[\s\S]*?type: "case-pages"/);
  assert.match(appJs, /id: "energy-website"[\s\S]*?type: "case-pages"/);
  assert.doesNotMatch(appJs, /id: "shanhaijing"[\s\S]*?type: "pdf"/);
  assert.doesNotMatch(appJs, /id: "energy-website"[\s\S]*?type: "pdf"/);
});

test("digital human project opens a six-video carousel with left and right controls", () => {
  const videoSourceMatches = appJs.match(/digital-human-videos\/digital-human-\d{2}\.mp4/g) ?? [];
  const posterSourceMatches = appJs.match(/digital-human-videos\/digital-human-\d{2}-poster\.jpg/g) ?? [];
  const loadingRule = stylesCss.match(/\.case-lightbox-video\.is-loading\s*\{[^}]*\}/)?.[0] ?? "";

  assert.equal(new Set(videoSourceMatches).size, 6);
  assert.equal(new Set(posterSourceMatches).size, 6);
  for (let index = 1; index <= 6; index += 1) {
    assert.equal(
      existsSync(`${projectRoot}/assets/digital-human-videos/digital-human-${String(index).padStart(2, "0")}-poster.jpg`),
      true
    );
    assert.ok(
      statSync(`${projectRoot}/assets/digital-human-videos/digital-human-${String(index).padStart(2, "0")}.mp4`).size < 25 * 1024 * 1024,
      `digital-human-${String(index).padStart(2, "0")}.mp4 is small enough for web playback`
    );
  }
  assert.match(indexHtml, /id="caseVideoCarousel"/);
  assert.match(indexHtml, /id="caseVideoPrev"/);
  assert.match(indexHtml, /id="caseVideoNext"/);
  assert.match(indexHtml, /id="caseVideoCount"/);
  assert.match(stylesCss, /\.case-video-carousel/);
  assert.match(stylesCss, /\.case-video-nav/);
  assert.match(appJs, /let activeCaseVideoIndex = 0/);
  assert.match(appJs, /function showCaseVideo\(project, index\)/);
  assert.match(appJs, /caseVideoPrev\?\.addEventListener\("click"/);
  assert.match(appJs, /caseVideoNext\?\.addEventListener\("click"/);
  assert.match(appJs, /caseLightboxVideo\.classList\.add\("is-loading"\)/);
  assert.match(appJs, /caseLightboxVideo\.removeAttribute\("src"\)/);
  assert.match(appJs, /caseLightboxVideo\.poster = nextPoster/);
  assert.match(appJs, /caseLightboxVideo\.onloadedmetadata = \(\) =>/);
  assert.match(stylesCss, /\.case-lightbox-video\.is-loading/);
  assert.doesNotMatch(loadingRule, /opacity:\s*0\s*;/);
});

test("works browser can collapse again after it has been opened", () => {
  assert.match(appJs, /function closeCaseBrowser\(/);
  assert.match(appJs, /caseBrowser\.classList\.add\("is-collapsed"\)/);
  assert.match(appJs, /caseBrowser\.classList\.remove\("is-open"\)/);
  assert.match(appJs, /if \(page\.classList\.contains\("is-selected"\)\)/);
  assert.match(appJs, /closeCaseBrowser\(\)/);
});

test("profile education and contact use the latest Chinese resume details", () => {
  assert.match(indexHtml, /教育背景:/);
  assert.match(indexHtml, /硕士 · 视觉传达与数字媒体/);
  assert.match(indexHtml, /UX\/UI · AI 体验 · 数字产品表达/);
  assert.match(indexHtml, /联系方式:/);
  assert.match(indexHtml, /TEL: 17863997690/);
  assert.match(indexHtml, /EMA: 1507405976@qq\.com/);
  assert.doesNotMatch(indexHtml, /本科 · 设计相关方向/);
  assert.doesNotMatch(indexHtml, /profile-info-mark/);
});

test("profile summary uses the revised first two sentences and keeps the third sentence", () => {
  assert.match(indexHtml, /多段 UX\/UI、AI 体验与 AIGC 设计经历。/);
  assert.match(indexHtml, /目前参与近千万月活 C 端 AI 产品体验，累计推进 80\+ 页面；也做过 AI 招聘 B 端复杂流程、AIGC 内容生产及 0-1 AI 互动项目。/);
  assert.match(indexHtml, /具备成熟的 AI 工作流能力，能够将多个 AI 工具协同运用于调研、发散、方案推进与表达输出，形成稳定高效的设计方式。/);
  assert.doesNotMatch(indexHtml, /2 年设计相关经验，经历多段实习和 1 段正式工作/);
  assert.doesNotMatch(indexHtml, /参与过 Emochi APP 等真实业务项目迭代/);
});

test("profile core skills block stays compact and top aligned beside the summary", () => {
  assert.match(stylesCss, /\.profile-info-table\s*{[\s\S]*?grid-template-columns: minmax\(0, 0\.92fr\) minmax\(220px, 0\.38fr\)/);
  assert.match(stylesCss, /\.profile-info-table > \.profile-info-cell:nth-child\(1\)\s*{[\s\S]*?grid-column: 1/);
  assert.match(stylesCss, /\.profile-info-table > \.profile-info-cell:nth-child\(2\)\s*{[\s\S]*?grid-column: 2/);
  assert.match(stylesCss, /\.profile-summary-cell\s*{[\s\S]*?grid-column: 1/);
  assert.match(stylesCss, /\.profile-skills-cell\s*{[\s\S]*?grid-column: 2/);
  assert.match(stylesCss, /\.profile-skills-cell\s*{[\s\S]*?align-self: start/);
  assert.match(stylesCss, /\.profile-skills-cell\s*{[\s\S]*?min-height: auto/);
  assert.match(stylesCss, /\.profile-direction-list\s*{[\s\S]*?gap: 6px/);
});

test("profile timeline first item reflects the current Emochi UX UI role", () => {
  assert.match(indexHtml, /<time>2025\.06 - 至今<\/time>/);
  assert.match(indexHtml, /重流（上海）智能科技有限公司 \/ UX\/UI 设计师/);
  assert.match(indexHtml, /情感陪伴、角色认知与订阅转化/);
  assert.match(indexHtml, /核心页面、活动承接与转化链路/);
  assert.doesNotMatch(indexHtml, /<time>2024 - 2026<\/time>/);
  assert.doesNotMatch(indexHtml, /UX\/UI & AI Experience Portfolio/);
});

test("profile timeline second item follows with the Kuaikan AIGC internship", () => {
  const timelineSource = indexHtml.match(/<ol class="profile-timeline[\s\S]*?<\/ol>/)?.[0] ?? "";
  assert.match(timelineSource, /<time>2025\.06 - 至今<\/time>[\s\S]*?<time>2025\.01 - 2025\.04<\/time>/);
  assert.match(timelineSource, /快看漫画 \/ AIGC 内容设计实习生/);
  assert.match(timelineSource, /互动漫画内容生产/);
  assert.match(timelineSource, /角色生成效率、视觉一致性与素材复用管理/);
  assert.doesNotMatch(timelineSource, /<time>UX\/UI DESIGN<\/time>[\s\S]*?蓝领招工 \/ B 端业务流程设计/);
});

test("profile timeline third item follows with the blue-collar recruiting platform role", () => {
  const timelineSource = indexHtml.match(/<ol class="profile-timeline[\s\S]*?<\/ol>/)?.[0] ?? "";
  assert.match(timelineSource, /<time>2025\.01 - 2025\.04<\/time>[\s\S]*?<time>2025\.11 - 2026\.01<\/time>/);
  assert.match(timelineSource, /蓝领制造行业 AI 数智化招工平台 \/ UX\/UI 设计师/);
  assert.match(timelineSource, /蓝领员工端、推荐人端与驻场端/);
  assert.match(timelineSource, /信息录入依赖人工、岗位可信度判断成本高、报名到入职状态断裂/);
  assert.match(timelineSource, /从找活、建档到跟进入职的协同流程/);
  assert.doesNotMatch(timelineSource, /<time>AI PRODUCT<\/time>[\s\S]*?Emochi \/ AI 情感陪伴产品体验/);
});

test("profile timeline continues with DT RADIO and independent AI build work", () => {
  const timelineSource = indexHtml.match(/<ol class="profile-timeline[\s\S]*?<\/ol>/)?.[0] ?? "";
  assert.match(timelineSource, /<time>2025\.11 - 2026\.01<\/time>[\s\S]*?<time>2026\.06<\/time>/);
  assert.match(timelineSource, /DT RADIO \| AI 互动体验项目 \/ 独立项目 \| AI 体验设计/);
  assert.match(timelineSource, /垂直人群语境、聊天陪伴、歌曲推荐与纪念票生成/);
  assert.match(timelineSource, /从概念定义、体验设计到 Vibe Coding 落地的完整链路/);
  assert.match(timelineSource, /独立 AI 搭建 \/ Vibe Coding 实践/);
  assert.match(timelineSource, /持续搭建生长库、交互式个人作品集网站及多个轻量化 Vibe Coding 项目/);
  assert.doesNotMatch(timelineSource, /Vibe Coding \/ 交互式个人网站/);
});

test("profile timeline uses a top-right group toggle and collapses every item into one stack", () => {
  assert.match(indexHtml, /<div class="profile-timeline-wrap">/);
  assert.match(indexHtml, /<button class="profile-timeline-toggle" id="profileTimelineToggle"[\s\S]*?<ol class="profile-timeline is-collapsed" id="profileTimeline"/);
  assert.match(indexHtml, /<ol class="profile-timeline is-collapsed" id="profileTimeline"/);
  assert.match(indexHtml, /<li data-timeline-extra>/);
  assert.match(indexHtml, /id="profileTimelineToggle"/);
  assert.match(indexHtml, /aria-controls="profileTimeline" aria-expanded="false"/);
  assert.match(indexHtml, /展开更多经历/);
  assert.match(indexHtml, /收起经历/);
  assert.match(stylesCss, /\.profile-timeline-wrap\s*{[\s\S]*?position: relative/);
  assert.match(stylesCss, /\.profile-timeline-toggle\s*{[\s\S]*?position: absolute/);
  assert.match(stylesCss, /\.profile-timeline-toggle\s*{[\s\S]*?right: clamp/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed\s*{[\s\S]*?position: relative/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed\s*{[\s\S]*?overflow: hidden/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li\s*{[\s\S]*?position: absolute/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li\s*{[\s\S]*?left: clamp\(24px, 3vw, 46px\)/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li\s*{[\s\S]*?right: clamp\(24px, 3vw, 46px\)/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li:nth-of-type\(1\)\s*{[\s\S]*?top: clamp\(82px, 5vw, 96px\)/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li:nth-of-type\(2\)\s*{[\s\S]*?top: clamp\(190px, 12vw, 228px\)/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li:nth-of-type\(3\)\s*{[\s\S]*?z-index: 3/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li:nth-of-type\(4\)\s*{[\s\S]*?top: clamp\(406px, 26vw, 492px\)/);
  assert.match(stylesCss, /\.profile-timeline\.is-collapsed li:nth-of-type\(5\)\s*{[\s\S]*?top: clamp\(514px, 33vw, 624px\)/);
  assert.doesNotMatch(stylesCss, /\.profile-timeline\.is-collapsed li\[data-timeline-extra\]\s*{/);
  assert.match(stylesCss, /\.profile-timeline\.is-expanded/);
  assert.match(stylesCss, /\.profile-timeline\.is-expanded li\s*{[\s\S]*?position: relative/);
  assert.match(stylesCss, /overflow-y: visible/);
  assert.match(appJs, /function setProfileTimelineExpanded\(isExpanded\)/);
  assert.match(appJs, /profileTimelineToggle\?\.addEventListener\("click"/);
  assert.match(appJs, /setProfileTimelineExpanded\(!profileTimeline\.classList\.contains\("is-expanded"\)\)/);
});

test("profile removes the oversized name card from the info table", () => {
  assert.doesNotMatch(indexHtml, /profile-info-name/);
  assert.doesNotMatch(indexHtml, /<span>NAME:<\/span>/);
  assert.doesNotMatch(stylesCss, /\.profile-info-name/);
});

test("emochi project opens the exported PDF case study", () => {
  assert.match(indexHtml, /id="caseLightboxFrame"/);
  assert.match(indexHtml, /id="caseLightboxPages"/);
  assert.match(indexHtml, /href="\.\/assets\/emochi\.pdf"/);
  assert.match(appJs, /id: "emochi"/);
  assert.match(appJs, /length: 33/);
  assert.match(appJs, /assets\/emochi-case\/page-/);
  assert.match(appJs, /pdfSrc: "\.\/assets\/emochi\.pdf"/);
  assert.match(appJs, /type: "case-pages"/);
});

test("dt radio opens as exported fullscreen case pages instead of a pdf viewer", () => {
  const dtProjectSource = appJs.match(/id: "dt-radio"[\s\S]*?type: "case-pages"\s*\n  }/)?.[0] ?? "";

  assert.match(indexHtml, /data-project="dt-radio"/);
  assert.match(indexHtml, /DT RADIO/);
  assert.match(indexHtml, /assets\/dt-radio-cover\.jpg/);
  assert.match(dtProjectSource, /id: "dt-radio"/);
  assert.match(dtProjectSource, /liveUrl: "https:\/\/dt-radio\.pages\.dev"/);
  assert.match(appJs, /const dtRadioCasePages = Array\.from\(\s*\{\s*length: 9\s*\}/);
  assert.match(appJs, /assets\/dt-radio-case\/page-/);
  assert.match(dtProjectSource, /pages: dtRadioCasePages/);
  assert.doesNotMatch(dtProjectSource, /pdfSrc/);
  assert.doesNotMatch(dtProjectSource, /type: "external-case"/);
  assert.doesNotMatch(dtProjectSource, /type: "pdf"/);
  assert.match(appJs, /const actionHref = project\.liveUrl \|\| project\.pdfSrc/);
  assert.match(appJs, /caseLightboxPdfLink\.textContent = project\.liveUrl \? "访问上线网站" : "打开 PDF"/);
});

test("footer keeps the visual scrolling wall before the navigation footer", () => {
  assert.match(indexHtml, /footer-visual-wall/);
  assert.match(indexHtml, /视觉滚动墙/);
  assert.match(indexHtml, /AI products\./);
  assert.match(indexHtml, /Workflow systems\./);
  assert.match(indexHtml, /Visual stories\./);
  assert.match(indexHtml, /C-end AI companionship/);
  assert.match(indexHtml, /footer-wall-track/);
  for (let index = 1; index <= 12; index += 1) {
    const asset = `assets/footer-wall-ip-${String(index).padStart(2, "0")}.webp`;
    assert.match(indexHtml, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(existsSync(`${projectRoot}/${asset}`), true);
    assert.ok(statSync(`${projectRoot}/${asset}`).size < 240 * 1024, `${asset} is lightweight`);
  }
  assert.doesNotMatch(indexHtml, /footer-wall-track[\s\S]*?footer-wall-ip-\d{2}\.png/);
  assert.match(indexHtml, /footer-wall-track[\s\S]*?loading="lazy"/);
  assert.doesNotMatch(indexHtml, /footer-wall-track[\s\S]*?assets\/dt-radio-cover\.jpg/);
  assert.doesNotMatch(indexHtml, /footer-wall-track[\s\S]*?assets\/emochi-cover\.png/);
  assert.doesNotMatch(indexHtml, /footer-wall-track[\s\S]*?assets\/profile-photo-1\.jpeg/);
  assert.match(stylesCss, /\.footer-visual-wall/);
  assert.match(stylesCss, /@keyframes footerWallDrift/);
  assert.doesNotMatch(indexHtml, /profile-info-name/);
});

test("footer visual wall tracks are wide enough to fill the viewport before drifting", () => {
  const topTrack = indexHtml.match(/<div class="footer-wall-track footer-wall-track-top"[\s\S]*?<\/div>/)?.[0] ?? "";
  const bottomTrack = indexHtml.match(/<div class="footer-wall-track footer-wall-track-bottom"[\s\S]*?<\/div>/)?.[0] ?? "";
  const topImages = topTrack.match(/footer-wall-ip-\d{2}\.webp/g) ?? [];
  const bottomImages = bottomTrack.match(/footer-wall-ip-\d{2}\.webp/g) ?? [];

  assert.equal(topImages.length, 24);
  assert.equal(bottomImages.length, 24);
  for (let index = 1; index <= 12; index += 1) {
    const asset = `footer-wall-ip-${String(index).padStart(2, "0")}.webp`;
    assert.equal(topImages.filter((src) => src === asset).length, 2);
    assert.equal(bottomImages.filter((src) => src === asset).length, 2);
  }
  assert.match(stylesCss, /\.footer-wall-track\s*{[\s\S]*?left: 0/);
  assert.match(stylesCss, /@keyframes footerWallDrift\s*{[\s\S]*?translate3d\(0, var\(--wall-y\), 0\)/);
  assert.match(stylesCss, /@keyframes footerWallDrift\s*{[\s\S]*?translate3d\(-50%, var\(--wall-y\), 0\)/);
  assert.doesNotMatch(stylesCss, /--wall-start/);
});

test("footer visual wall keeps the headline area clear from drifting images", () => {
  assert.match(stylesCss, /\.footer-visual-wall\s*\{[\s\S]*?min-height: clamp\(720px, 56vw, 980px\)/s);
  assert.match(stylesCss, /\.footer-visual-wall::before\s*\{[\s\S]*?radial-gradient\(ellipse 70% 50% at center/s);
  assert.match(stylesCss, /\.footer-wall-track\s*\{[\s\S]*?--wall-y:\s*0px/s);
  assert.match(stylesCss, /\.footer-wall-track-top\s*\{[\s\S]*?top: clamp\(52px, 4\.4vw, 84px\)/s);
  assert.match(stylesCss, /\.footer-wall-track-bottom\s*\{[\s\S]*?bottom: clamp\(50px, 4\.3vw, 82px\)/s);
  assert.match(stylesCss, /width:\s*clamp\(168px,\s*12\.8vw,\s*252px\)/);
  assert.match(stylesCss, /object-fit:\s*contain/);
  assert.match(stylesCss, /\.footer-wall-copy h2\s*\{[\s\S]*?font-size: clamp\(46px, 6\.6vw, 106px\)/s);
  assert.match(stylesCss, /\.footer-wall-copy h2\s*\{[\s\S]*?line-height: 1\.2/s);
  assert.match(stylesCss, /\.footer-wall-copy p\s*\{[\s\S]*?margin: 0 0 30px/s);
  assert.match(stylesCss, /\.footer-wall-copy span\s*\{[\s\S]*?margin-top: 34px/s);
  assert.match(stylesCss, /translate3d\(0,\s*var\(--wall-y\),\s*0\)/);
  assert.match(stylesCss, /translate3d\(-50%,\s*var\(--wall-y\),\s*0\)/);
  assert.doesNotMatch(stylesCss, /--wall-start/);
});

test("hero layout uses the revised works-signature row and separate portfolio baseline", () => {
  assert.match(indexHtml, /class="hero-ledger-title"/);
  assert.match(indexHtml, /hero-ledger-signature/);
  assert.match(indexHtml, /hero-portfolio-word/);
  assert.doesNotMatch(indexHtml, /portfolio-lockup/);
});

test("background music loops for the full homepage session", () => {
  assert.match(indexHtml, /<audio[^>]*id="bgmAudio"[^>]*loop[^>]*>/);
  assert.match(indexHtml, /id="bgmToggle"/);
  assert.match(indexHtml, /bgm-toggle-bars/);
});

test("script data reflects the rewritten hero scenes and intro states", () => {
  const heroScenesSource = appJs.match(/const heroScenes = \[[\s\S]*?\n\];/)?.[0] ?? "";

  for (const label of [
    "UX/UI Design",
    "AI Systems",
    "Visual Language",
    "Motion Design"
  ]) {
    assert.match(heroScenesSource, new RegExp(`title: "${label.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}"`));
  }

  assert.doesNotMatch(heroScenesSource, /title: "Selected Works"/);
  assert.doesNotMatch(heroScenesSource, /titleLines: \["SELECTED", "WORKS"\]/);
  assert.doesNotMatch(heroScenesSource, /index: "05"/);
  assert.match(heroScenesSource, /titleLines: \["UX\/UI", "DESIGN"\]/);
  assert.match(heroScenesSource, /titleLines: \["AI", "SYSTEMS"\]/);
  assert.match(heroScenesSource, /titleLines: \["VISUAL", "LANGUAGE"\]/);
  assert.match(heroScenesSource, /titleLines: \["MOTION", "DESIGN"\]/);
  assert.match(appJs, /const introStage = \{/);
  assert.match(appJs, /galaxy: "galaxy"/);
  assert.match(appJs, /transition: "transition"/);
  assert.match(appJs, /butterfly: "butterfly"/);
  assert.match(appJs, /introPrompt\?\.setAttribute\("hidden", ""\)/);
  assert.match(appJs, /function startIntroFromGesture\(/);
  assert.match(appJs, /window\.addEventListener\("pointerdown", startIntroFromGesture/);
  assert.match(appJs, /heroTitle\.innerHTML = scene\.titleLines/);
  assert.match(appJs, /function updateBgmToggleState\(/);
  assert.match(appJs, /function pauseBgm\(/);
  assert.match(appJs, /function resumeBgm\(/);
  assert.match(appJs, /bgmToggle\.addEventListener\("click"/);
});

test("galaxy renderer uses the newer center-burst particle system instead of the old random starfield", () => {
  assert.match(appJs, /const galaxyConfig = \{/);
  assert.match(appJs, /function createGalaxyParticle\(/);
  assert.match(appJs, /function respawnGalaxyParticle\(/);
  assert.match(appJs, /function drawGalaxyCore\(/);
  assert.equal((appJs.match(/function drawGalaxyFrame\(/g) || []).length, 1);
  assert.doesNotMatch(appJs, /galaxyStars\.forEach/);
  assert.doesNotMatch(appJs, /function createGalaxyStar\(/);
});

test("styles include the new galaxy prompt and remove scale-heavy card hover", () => {
  assert.match(stylesCss, /\.intro-galaxy-canvas/);
  assert.match(stylesCss, /\.intro-prompt-copy/);
  assert.doesNotMatch(stylesCss, /\.ability-card:hover\s*\{[^}]*scale/s);
  assert.doesNotMatch(stylesCss, /\.ability-card-aigc:hover\s*\{[^}]*scale/s);
});

test("styles hide the visible scrollbar and give the center card a distinct larger scale", () => {
  assert.match(stylesCss, /scrollbar-width:\s*none/);
  assert.match(stylesCss, /::-webkit-scrollbar/);
  assert.match(stylesCss, /\.ability-card\s*\{[^}]*border:\s*none/s);
  assert.match(stylesCss, /--ability-card-center-w:/);
  assert.match(stylesCss, /\.ability-card-aigc\s*\{[^}]*width:\s*var\(--ability-card-center-w/s);
});

test("left research card shares the same left alignment line as the hero text block", () => {
  assert.match(stylesCss, /\.hero-ledger\s*\{[^}]*left:\s*var\(--hero-left-edge\)/s);
  assert.match(stylesCss, /\.ability-card-research\s*\{[^}]*left:\s*var\(--hero-left-edge\)/s);
});

test("scrolling hero titles sit 20px lower than the previous baseline", () => {
  assert.match(stylesCss, /\.hero-copy\s*\{[^}]*bottom:\s*clamp\(34px,\s*calc\(7vh - 20px\),\s*66px\)/s);
});
