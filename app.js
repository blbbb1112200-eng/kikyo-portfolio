const introLoader = document.querySelector("#introLoader");
const introGalaxyCanvas = document.querySelector("#introGalaxyCanvas");
const introPrompt = document.querySelector("#introPrompt");
const introPercent = document.querySelector("#introPercent");
const introProgressFill = document.querySelector("#introProgressFill");
const butterflyParticles = document.querySelector("#butterflyParticles");
const bgmAudio = document.querySelector("#bgmAudio");
const bgmToggle = document.querySelector("#bgmToggle");
const abilityVideos = Array.from(document.querySelectorAll(".ability-card video"));
const profileTimeline = document.querySelector("#profileTimeline");
const profileTimelineToggle = document.querySelector("#profileTimelineToggle");
let introFinished = false;
let introProgressStarted = false;
let timelineStarted = false;
let timelineStartTime = 0;
let audioUnlockBound = false;
let bgmManuallyPaused = false;
let userControlledHero = false;
let introFallbackTimer = 0;
let currentIntroStage = "galaxy";
let galaxyFrame = 0;
let galaxyParticles = [];
let galaxyContext = null;
let galaxyCenter = { x: 0.5, y: 0.5 };
let galaxyTarget = { x: 0.5, y: 0.5 };
const requireUserGestureForSound = true;
const previewMode = new URLSearchParams(window.location.search).get("preview") === "1";
const introStage = {
  galaxy: "galaxy",
  transition: "transition",
  butterfly: "butterfly",
  complete: "complete"
};
const galaxyConfig = {
  streamCount: 210,
  dustCount: 64,
  pointerEase: 0.052,
  pointerRangeX: 0.065,
  pointerRangeY: 0.048,
  repulsionRadius: 0.2,
  repulsionStrength: 0.12,
  centerGlowRadius: 0.21,
  streamScale: 0.98,
  dustScale: 1.18
};

const timelineFps = 30;
const cue = (seconds, frames = 0) => seconds + frames / timelineFps;
const timelineCues = {
  introEnd: cue(5, 19),
  headlineIn: cue(6, 21),
  cardsIn: cue(7, 24)
};
const introDuration = timelineCues.introEnd * 1000;

abilityVideos.forEach((video) => {
  video.muted = true;
  video.loop = true;
  video.pause();
  video.currentTime = 0;
});

if (bgmAudio) {
  bgmAudio.loop = true;
}

function updateBgmToggleState() {
  if (!bgmToggle) return;
  const isMuted = !bgmAudio || bgmAudio.paused || bgmManuallyPaused;
  bgmToggle.classList.toggle("is-muted", isMuted);
  bgmToggle.setAttribute("aria-pressed", isMuted ? "true" : "false");
  bgmToggle.setAttribute("aria-label", isMuted ? "播放背景音乐" : "暂停背景音乐");
}

function pauseBgm({ manual = false } = {}) {
  if (!bgmAudio) return;
  if (manual) {
    bgmManuallyPaused = true;
  }
  bgmAudio.pause();
  updateBgmToggleState();
}

function resumeBgm() {
  if (!bgmAudio) return;
  bgmManuallyPaused = false;
  playBgmFromTimeline();
}

function getInitialViewportReset({ pathname = "/", search = "", hash = "" } = {}) {
  if (!hash) {
    return {
      shouldReset: false,
      url: `${pathname}${search}`
    };
  }

  return {
    shouldReset: true,
    url: `${pathname}${search}`
  };
}

function shouldAutoStartIntro({ requireUserGestureForSound = true } = {}) {
  return !requireUserGestureForSound;
}

function resetViewportToHero({ clearHash = true } = {}) {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  if (clearHash) {
    const reset = getInitialViewportReset(window.location);
    if (reset.shouldReset) {
      window.history.replaceState(null, "", reset.url);
    }
  }

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function buildButterflyParticles() {
  if (!butterflyParticles) return;

  const namespace = "http://www.w3.org/2000/svg";
  const particleCount = 52;

  for (let index = 0; index < particleCount; index += 1) {
    const t = (index / particleCount) * Math.PI * 2;
    const wingScale = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
    const x = Math.sin(t) * wingScale * 18;
    const y = -Math.cos(t) * wingScale * 15;
    const particle = document.createElementNS(namespace, "circle");
    particle.setAttribute("class", "butterfly-particle");
    particle.setAttribute("cx", String(110 + x));
    particle.setAttribute("cy", String(82 + y));
    particle.setAttribute("r", String(index % 7 === 0 ? 1.8 : 1.15));
    particle.style.setProperty("--x", `${x}px`);
    particle.style.setProperty("--y", `${y}px`);
    particle.style.setProperty("--delay", `${180 + index * 18}ms`);
    butterflyParticles.appendChild(particle);
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createGalaxyParticle(kind = "stream") {
  return {
    kind,
    angle: 0,
    progress: 0,
    speed: 0,
    length: 0,
    width: 0,
    alpha: 0,
    twinkle: randomBetween(0, Math.PI * 2),
    twinkleSpeed: randomBetween(0.008, 0.032),
    swirl: randomBetween(-0.12, 0.12),
    wobble: randomBetween(0.001, 0.005),
    offset: randomBetween(-0.075, 0.075),
    glow: randomBetween(0.8, 1.4)
  };
}

function respawnGalaxyParticle(particle, width, height, progressOverride = null) {
  const isStream = particle.kind === "stream";
  const aspect = width / Math.max(height, 1);

  particle.angle = randomBetween(0, Math.PI * 2);
  particle.progress = progressOverride ?? randomBetween(isStream ? 0.02 : 0.12, isStream ? 1.04 : 1.12);
  particle.speed = randomBetween(isStream ? 0.0032 : 0.00045, isStream ? 0.0115 : 0.00125);
  particle.length = randomBetween(isStream ? 16 : 4, isStream ? 108 : 20);
  particle.width = randomBetween(isStream ? 0.7 : 0.45, isStream ? 2.15 : 1.35);
  particle.alpha = randomBetween(isStream ? 0.26 : 0.08, isStream ? 0.82 : 0.24);
  particle.swirl = randomBetween(isStream ? -0.18 : -0.08, isStream ? 0.18 : 0.08);
  particle.wobble = randomBetween(isStream ? 0.0014 : 0.0004, isStream ? 0.0058 : 0.0014);
  particle.offset = randomBetween(-0.08, 0.08) * aspect;
  particle.glow = randomBetween(isStream ? 0.92 : 0.55, isStream ? 1.5 : 1.1);
}

function seedGalaxyParticles() {
  if (!introGalaxyCanvas) return;
  const { width, height } = introGalaxyCanvas;

  galaxyParticles = Array.from({ length: galaxyConfig.streamCount + galaxyConfig.dustCount }, (_, index) => {
    const kind = index < galaxyConfig.streamCount ? "stream" : "dust";
    const particle = createGalaxyParticle(kind);
    respawnGalaxyParticle(particle, width, height);
    return particle;
  });
}

function drawGalaxyCore(context, originX, originY, width, height) {
  const coreRadius = Math.min(width, height) * galaxyConfig.centerGlowRadius;
  const coreGlow = context.createRadialGradient(originX, originY, 0, originX, originY, coreRadius);
  coreGlow.addColorStop(0, "rgba(252, 252, 255, 0.8)");
  coreGlow.addColorStop(0.08, "rgba(224, 236, 255, 0.62)");
  coreGlow.addColorStop(0.24, "rgba(144, 184, 255, 0.2)");
  coreGlow.addColorStop(0.52, "rgba(32, 56, 92, 0.06)");
  coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(originX, originY, coreRadius, 0, Math.PI * 2);
  context.fill();

  const beamGlow = context.createRadialGradient(originX, originY, 0, originX, originY, Math.min(width, height) * 0.78);
  beamGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
  beamGlow.addColorStop(0.18, "rgba(120, 150, 220, 0.08)");
  beamGlow.addColorStop(0.42, "rgba(30, 42, 70, 0.035)");
  beamGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = beamGlow;
  context.fillRect(0, 0, width, height);
}

function drawGalaxyFrame() {
  if (!introGalaxyCanvas || !galaxyContext) return;

  const { width, height } = introGalaxyCanvas;
  const nextCenterX = 0.5 + (galaxyTarget.x - 0.5) * galaxyConfig.pointerRangeX;
  const nextCenterY = 0.5 + (galaxyTarget.y - 0.5) * galaxyConfig.pointerRangeY;
  galaxyCenter.x += (nextCenterX - galaxyCenter.x) * galaxyConfig.pointerEase;
  galaxyCenter.y += (nextCenterY - galaxyCenter.y) * galaxyConfig.pointerEase;

  const originX = width * galaxyCenter.x;
  const originY = height * galaxyCenter.y;
  const pointerX = width * galaxyTarget.x;
  const pointerY = height * galaxyTarget.y;
  const aspectScale = width / Math.max(height, 1);

  const background = galaxyContext.createRadialGradient(originX, originY, 0, originX, originY, Math.max(width, height) * 0.9);
  background.addColorStop(0, "rgba(8, 10, 18, 1)");
  background.addColorStop(0.38, "rgba(5, 7, 14, 1)");
  background.addColorStop(0.72, "rgba(2, 4, 10, 1)");
  background.addColorStop(1, "rgba(1, 2, 6, 1)");
  galaxyContext.fillStyle = background;
  galaxyContext.fillRect(0, 0, width, height);

  drawGalaxyCore(galaxyContext, originX, originY, width, height);
  galaxyContext.globalCompositeOperation = "screen";

  galaxyParticles.forEach((particle) => {
    particle.progress += particle.speed;
    particle.twinkle += particle.twinkleSpeed;
    if (particle.progress > 1.18) {
      respawnGalaxyParticle(particle, width, height, particle.kind === "stream" ? randomBetween(0.01, 0.08) : randomBetween(0.14, 0.3));
    }

    const isStream = particle.kind === "stream";
    const radialProgress = Math.pow(particle.progress, isStream ? 1.82 : 1.32);
    const orbitAngle = particle.angle + particle.swirl * particle.progress + Math.sin(particle.twinkle * 0.35) * particle.wobble * 180;
    const baseDistance = (isStream ? galaxyConfig.streamScale : galaxyConfig.dustScale) * Math.min(width, height) * radialProgress;
    const drift = particle.offset * Math.min(width, height) * radialProgress * 0.18;
    const axisX = Math.cos(orbitAngle) * (baseDistance * aspectScale + drift);
    const axisY = Math.sin(orbitAngle) * baseDistance;
    let screenX = originX + axisX;
    let screenY = originY + axisY;

    const distanceToPointer = Math.hypot(screenX - pointerX, screenY - pointerY);
    const repulsionLimit = Math.min(width, height) * galaxyConfig.repulsionRadius;
    if (distanceToPointer < repulsionLimit) {
      const repelForce = (1 - distanceToPointer / repulsionLimit) * galaxyConfig.repulsionStrength;
      const repelAngle = Math.atan2(screenY - pointerY, screenX - pointerX);
      screenX += Math.cos(repelAngle) * repelForce * width;
      screenY += Math.sin(repelAngle) * repelForce * height;
    }

    const directionX = screenX - originX;
    const directionY = screenY - originY;
    const directionLength = Math.max(1, Math.hypot(directionX, directionY));
    const unitX = directionX / directionLength;
    const unitY = directionY / directionLength;
    const tailLength = particle.length * (0.2 + particle.progress * 1.08);
    const tailX = screenX - unitX * tailLength;
    const tailY = screenY - unitY * tailLength;
    const shimmer = 0.72 + Math.sin(particle.twinkle) * 0.28;
    const lineAlpha = particle.alpha * shimmer;

    const streakGradient = galaxyContext.createLinearGradient(tailX, tailY, screenX, screenY);
    streakGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    streakGradient.addColorStop(0.38, `rgba(178, 196, 230, ${lineAlpha * 0.3})`);
    streakGradient.addColorStop(1, `rgba(255, 255, 255, ${lineAlpha})`);

    galaxyContext.beginPath();
    galaxyContext.strokeStyle = streakGradient;
    galaxyContext.lineWidth = particle.width * (0.68 + particle.progress * 0.5);
    galaxyContext.moveTo(tailX, tailY);
    galaxyContext.lineTo(screenX, screenY);
    galaxyContext.stroke();

    galaxyContext.beginPath();
    galaxyContext.fillStyle = `rgba(255, 255, 255, ${Math.min(1, lineAlpha + 0.16)})`;
    galaxyContext.arc(screenX, screenY, particle.glow * (0.35 + particle.progress * 0.8), 0, Math.PI * 2);
    galaxyContext.fill();
  });

  galaxyContext.globalCompositeOperation = "source-over";
  if (currentIntroStage !== introStage.complete) {
    galaxyFrame = requestAnimationFrame(drawGalaxyFrame);
  }
}

function resizeGalaxyCanvas() {
  if (!introGalaxyCanvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(window.innerWidth * dpr);
  const height = Math.round(window.innerHeight * dpr);
  introGalaxyCanvas.width = width;
  introGalaxyCanvas.height = height;
  introGalaxyCanvas.style.width = `${window.innerWidth}px`;
  introGalaxyCanvas.style.height = `${window.innerHeight}px`;
  seedGalaxyParticles();
}

function startGalaxyCanvas() {
  if (!introGalaxyCanvas) return;
  galaxyContext = introGalaxyCanvas.getContext("2d");
  if (!galaxyContext) return;
  resizeGalaxyCanvas();
  cancelAnimationFrame(galaxyFrame);
  drawGalaxyFrame();
}

function beginIntroTransition() {
  if (currentIntroStage !== introStage.galaxy) return;
  currentIntroStage = introStage.transition;
  document.body.classList.add("is-galaxy-transition");
  window.setTimeout(() => {
    startIntroProgress();
  }, 320);
}

function startIntroFromGesture() {
  if (shouldAutoStartIntro({ requireUserGestureForSound })) return;
  if (introProgressStarted || introFinished || currentIntroStage !== introStage.galaxy) return;
  resetViewportToHero();
  beginIntroTransition();
}

function completeIntro() {
  if (introFinished) return;
  introFinished = true;
  currentIntroStage = introStage.complete;
  if (introFallbackTimer) {
    window.clearTimeout(introFallbackTimer);
    introFallbackTimer = 0;
  }
  if (introPercent) introPercent.textContent = "100";
  if (introProgressFill) introProgressFill.style.transform = "scaleX(1)";
  document.body.classList.add("is-intro-blackout");

  window.setTimeout(() => {
    document.body.classList.add("is-intro-fading");
  }, 150);

  window.setTimeout(() => {
    document.body.classList.remove("is-loading", "is-intro-blackout", "is-intro-fading");
    document.body.classList.add("is-intro-complete");
    introLoader?.setAttribute("hidden", "");
    resetViewportToHero();
    requestHeroUpdate();
  }, 460);
}

function easeLoading(progress) {
  return progress;
}

function startIntroProgress() {
  if (introProgressStarted) return;
  introProgressStarted = true;
  currentIntroStage = introStage.butterfly;
  introPrompt?.setAttribute("hidden", "");
  document.body.classList.add("is-intro-active");
  document.body.classList.remove("is-galaxy-stage", "is-galaxy-transition");
  introFallbackTimer = window.setTimeout(completeIntro, introDuration + 1200);
  const start = performance.now();
  startPageTimeline(start);
  playBgmFromTimeline();

  function tick(now) {
    if (introFinished) return;

    const rawProgress = Math.min(1, (now - start) / introDuration);
    const easedProgress = easeLoading(rawProgress);
    const percent = Math.min(100, Math.floor(easedProgress * 100));

    if (introPercent) {
      introPercent.textContent = String(percent).padStart(3, "0");
    }

    if (introProgressFill) {
      introProgressFill.style.transform = `scaleX(${easedProgress})`;
    }

    if (rawProgress >= 1) {
      completeIntro();
      return;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function runAtCue(cueTime, callback) {
  const delay = Math.max(0, cueTime * 1000 - (performance.now() - timelineStartTime));
  window.setTimeout(callback, delay);
}

function startPageTimeline(start) {
  if (timelineStarted) return;
  timelineStarted = true;
  timelineStartTime = start;

  runAtCue(timelineCues.headlineIn, () => {
    document.body.classList.add("is-headline-cued");
  });

  runAtCue(timelineCues.cardsIn, () => {
    document.body.classList.add("is-cards-cued");
    abilityVideos.forEach((video) => {
      video.play().catch(() => {});
    });
  });

}

function playBgmFromTimeline() {
  if (!bgmAudio || !timelineStarted) return;
  if (bgmManuallyPaused) {
    updateBgmToggleState();
    return;
  }
  const elapsedSeconds = Math.max(0, (performance.now() - timelineStartTime) / 1000);

  try {
    if (Number.isFinite(bgmAudio.duration) && bgmAudio.duration > elapsedSeconds) {
      bgmAudio.currentTime = elapsedSeconds;
    } else if (elapsedSeconds < 0.2) {
      bgmAudio.currentTime = 0;
    }
    bgmAudio.volume = 0.78;
    const playAttempt = bgmAudio.play();
    if (playAttempt?.catch) {
      playAttempt.catch(() => {
        bindAudioUnlock();
        updateBgmToggleState();
      });
    } else {
      updateBgmToggleState();
    }
  } catch {
    bindAudioUnlock();
    updateBgmToggleState();
  }
}

function bindAudioUnlock() {
  if (audioUnlockBound) return;
  audioUnlockBound = true;
  const unlock = () => {
    playBgmFromTimeline();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("wheel", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("wheel", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

if (bgmToggle) {
  bgmToggle.addEventListener("click", () => {
    if (!bgmAudio) return;
    if (bgmAudio.paused || bgmManuallyPaused) {
      resumeBgm();
      return;
    }
    pauseBgm({ manual: true });
  });
  updateBgmToggleState();
}

if (previewMode) {
  introFinished = true;
  currentIntroStage = introStage.complete;
  document.body.classList.remove("is-loading", "is-galaxy-stage", "is-galaxy-transition", "is-intro-active");
  document.body.classList.add("is-intro-complete");
  introLoader?.setAttribute("hidden", "");
} else if (introLoader) {
  currentIntroStage = introStage.galaxy;
  document.body.classList.add("is-galaxy-stage");
  resetViewportToHero();
  startGalaxyCanvas();
  buildButterflyParticles();

  window.addEventListener("pointermove", (event) => {
    const rect = introLoader.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top;
    introLoader.style.setProperty("--intro-mouse-x", `${x}px`);
    introLoader.style.setProperty("--intro-mouse-y", `${y * 0.08}px`);
    galaxyTarget.x = event.clientX / window.innerWidth;
    galaxyTarget.y = event.clientY / window.innerHeight;
  });

  window.addEventListener("pageshow", () => {
    if (!introFinished) resetViewportToHero();
  });

  window.addEventListener("resize", resizeGalaxyCanvas);

  if (shouldAutoStartIntro({ requireUserGestureForSound })) {
    window.addEventListener("load", startIntroProgress);
    window.setTimeout(() => {
      if (!introFinished && !document.readyState.includes("loading")) {
        startIntroProgress();
      }
    }, 400);
  } else {
    window.addEventListener("pointerdown", startIntroFromGesture, { passive: true });
    introLoader.addEventListener("click", startIntroFromGesture);
  }
}

const heroScenes = [
  {
    index: "01",
    title: "UX/UI Design",
    titleLines: ["UX/UI", "DESIGN"],
    text: "Clear interface structure, refined hierarchy, and production-ready composition.",
    start: 0.14,
    end: 0.28
  },
  {
    index: "02",
    title: "AI Systems",
    titleLines: ["AI", "SYSTEMS"],
    text: "AI flows that feel directed, legible, and emotionally in control.",
    start: 0.31,
    end: 0.45
  },
  {
    index: "03",
    title: "Visual Language",
    titleLines: ["VISUAL", "LANGUAGE"],
    text: "Character-led imagery, atmospheric composition, and a sharper visual signature.",
    start: 0.49,
    end: 0.63
  },
  {
    index: "04",
    title: "Motion Design",
    titleLines: ["MOTION", "DESIGN"],
    text: "Motion, response, and pacing shaped into interactions that carry intent.",
    start: 0.68,
    end: 0.8
  }
];

const heroFrameCount = 150;
const heroFrameStart = 10;
const heroIdBadgeStartFrame = 151;
const preloadedFrames = new Map();
const hero = document.querySelector(".scroll-hero");
const heroFrame = document.querySelector("#heroFrame");
const heroIdBadgePrint = document.querySelector("#heroIdBadgePrint");
const heroCopy = document.querySelector("#heroCopy");
const heroTitle = document.querySelector("#heroTitle");
const heroIndex = document.querySelector("#heroIndex");

let activeHeroScene = -1;
let activeImageFrame = heroFrameStart;
let ticking = false;

function padFrame(number) {
  return String(number).padStart(4, "0");
}

function framePath(frameNumber) {
  return `./assets/hero-frames/frame_${padFrame(frameNumber)}.jpg`;
}

function preloadNearbyFrames(centerFrame) {
  const start = Math.max(1, centerFrame - 5);
  const end = Math.min(heroFrameCount, centerFrame + 8);
  for (let frame = start; frame <= end; frame += 1) {
    if (preloadedFrames.has(frame)) continue;
    const image = new Image();
    image.src = framePath(frame);
    preloadedFrames.set(frame, image);
  }
}

function preloadAllFrames() {
  let frame = 1;
  const loadChunk = () => {
    const end = Math.min(heroFrameCount, frame + 9);
    for (; frame <= end; frame += 1) {
      if (preloadedFrames.has(frame)) continue;
      const image = new Image();
      image.src = framePath(frame);
      preloadedFrames.set(frame, image);
    }
    if (frame <= heroFrameCount) {
      window.setTimeout(loadChunk, 80);
    }
  };
  loadChunk();
}

function currentScene(progress) {
  return heroScenes.findIndex((scene) => progress >= scene.start && progress <= scene.end);
}

function heroScrollProgress() {
  if (!hero) return 0;
  const rect = hero.getBoundingClientRect();
  const total = Math.max(1, rect.height - window.innerHeight);
  return Math.min(1, Math.max(0, -rect.top / total));
}

function updateHeroCopy(sceneIndex) {
  if (!heroCopy) return;

  if (sceneIndex < 0) {
    heroCopy.classList.remove("is-entering");
    heroCopy.classList.add("is-hidden");
    return;
  }

  const scene = heroScenes[sceneIndex];
  if (sceneIndex !== activeHeroScene) {
    activeHeroScene = sceneIndex;
    heroTitle.innerHTML = scene.titleLines.map((line) => `<span>${line}</span>`).join("");
    heroTitle.setAttribute("aria-label", scene.title);
    heroIndex.textContent = scene.index;
    heroCopy.classList.remove("is-entering");
    void heroCopy.offsetWidth;
    heroCopy.classList.add("is-entering");
  }

  heroCopy.classList.remove("is-hidden");
}

function renderHeroProgress(progress) {
  const targetFrame = Math.min(
    heroFrameCount,
    Math.max(heroFrameStart, Math.round(progress * (heroFrameCount - heroFrameStart)) + heroFrameStart)
  );

  document.documentElement.style.setProperty("--curtain", String(Math.min(1, progress * 1.18)));
  document.documentElement.style.setProperty("--hero-zoom", String(progress));
  document.documentElement.style.setProperty("--hero-y", String(Math.round(progress * 52)));
  document.documentElement.style.setProperty("--stage-y", String(Math.round(progress * 150)));
  document.documentElement.style.setProperty(
    "--hero-id-badge-opacity",
    heroIdBadgePrint && targetFrame >= heroIdBadgeStartFrame ? "0.88" : "0"
  );

  if (heroFrame && targetFrame !== activeImageFrame) {
    activeImageFrame = targetFrame;
    heroFrame.src = framePath(targetFrame);
    preloadNearbyFrames(targetFrame);
  }

  const sceneIndex = currentScene(progress);
  updateHeroCopy(sceneIndex);

  if (sceneIndex < 0) {
    activeHeroScene = -1;
  }
}

function updateHero() {
  if (!hero) return;
  renderHeroProgress(heroScrollProgress());
}

function markHeroUserControl() {
  if (!document.body.classList.contains("is-intro-complete")) return;
  userControlledHero = true;
}

function requestHeroUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    updateHero();
    ticking = false;
  });
}

preloadNearbyFrames(heroFrameStart);
window.setTimeout(preloadAllFrames, 600);

const cards = Array.from(document.querySelectorAll(".photo-card"));
const dots = Array.from(document.querySelectorAll(".dots span"));
const prev = document.querySelector("#prevPhoto");
const next = document.querySelector("#nextPhoto");
const caseBrowser = document.querySelector("#caseBrowser");
const caseFolderTrigger = document.querySelector("#caseFolderTrigger");
const casePages = Array.from(document.querySelectorAll(".case-page"));
const caseLightbox = document.querySelector("#caseLightbox");
const caseLightboxImage = document.querySelector("#caseLightboxImage");
const caseVideoCarousel = document.querySelector("#caseVideoCarousel");
const caseLightboxVideo = document.querySelector("#caseLightboxVideo");
const caseVideoPrev = document.querySelector("#caseVideoPrev");
const caseVideoNext = document.querySelector("#caseVideoNext");
const caseVideoCount = document.querySelector("#caseVideoCount");
const caseLightboxFrame = document.querySelector("#caseLightboxFrame");
const caseLightboxPages = document.querySelector("#caseLightboxPages");
const caseLightboxPdfLink = document.querySelector("#caseLightboxPdfLink");
const caseLightboxClose = document.querySelector("#caseLightboxClose");
const casePreview = document.querySelector("#casePreview");
const casePreviewImage = document.querySelector("#casePreviewImage");
const casePreviewEyebrow = document.querySelector("#casePreviewEyebrow");
const casePreviewTitle = document.querySelector("#casePreviewTitle");
const casePreviewDescription = document.querySelector("#casePreviewDescription");
const casePreviewTags = document.querySelector("#casePreviewTags");
const casePreviewLiveLink = document.querySelector("#casePreviewLiveLink");
const casePreviewPdfLink = document.querySelector("#casePreviewPdfLink");
let activePhoto = 0;

const emochiCasePages = Array.from(
  { length: 29 },
  (_, index) => `./assets/emochi-case/page-${String(index + 1).padStart(2, "0")}.jpg`
);

const shanhaijingCasePages = Array.from(
  { length: 10 },
  (_, index) => `./assets/shanhaijing-case/page-${String(index + 1).padStart(2, "0")}.jpg`
);

const energyWebsiteCasePages = Array.from(
  { length: 12 },
  (_, index) => `./assets/energy-website-case/page-${String(index + 1).padStart(2, "0")}.jpg`
);

const blueCollarCasePages = Array.from(
  { length: 17 },
  (_, index) => `./assets/blue-collar-case/page-${String(index + 1).padStart(2, "0")}.jpg`
);

const dtRadioCasePages = Array.from(
  { length: 9 },
  (_, index) => `./assets/dt-radio-case/page-${String(index + 1).padStart(2, "0")}.jpg`
);

const digitalHumanVideos = [
  "./assets/digital-human-videos/digital-human-01.mp4",
  "./assets/digital-human-videos/digital-human-02.mp4",
  "./assets/digital-human-videos/digital-human-03.mp4",
  "./assets/digital-human-videos/digital-human-04.mp4",
  "./assets/digital-human-videos/digital-human-05.mp4",
  "./assets/digital-human-videos/digital-human-06.mp4"
];

const directProjects = [
  {
    id: "blue-collar",
    title: "蓝领招工 / B 端业务流程设计",
    src: "./assets/blue-collar-case/page-01.jpg",
    pages: blueCollarCasePages,
    type: "case-pages"
  },
  {
    id: "emochi",
    title: "Emochi / AI 情感陪伴产品体验",
    src: "./assets/emochi-cover.png",
    pdfSrc: "./assets/emochi.pdf",
    pages: emochiCasePages,
    type: "case-pages"
  },
  {
    id: "shanhaijing",
    title: "山海经 / AIGC 内容设计",
    src: "./assets/shanhaijing-cover.jpg",
    pdfSrc: "./assets/shanhaijing.pdf",
    pages: shanhaijingCasePages,
    type: "case-pages"
  },
  {
    id: "dt-radio",
    title: "DT RADIO",
    src: "./assets/dt-radio-cover.jpg",
    liveUrl: "https://dt-radio.pages.dev",
    pages: dtRadioCasePages,
    type: "case-pages"
  },
  {
    id: "energy-website",
    title: "能源网站 / Web Design",
    src: "./assets/energy-website-cover.png",
    pdfSrc: "./assets/energy-website.pdf",
    pages: energyWebsiteCasePages,
    type: "case-pages"
  },
  {
    id: "digital-human",
    title: "数字人视频 / Motion Workflow",
    src: "./assets/digital-human-cover.jpg",
    videoSources: digitalHumanVideos,
    type: "video-carousel"
  }
];

let activeCaseVideoIndex = 0;
let activeVideoProject = null;

function renderPhotoStack() {
  cards.forEach((card, index) => {
    const offset = (index - activePhoto + cards.length) % cards.length;
    card.classList.remove("stack-front", "stack-middle", "stack-back");
    card.classList.add(offset === 0 ? "stack-front" : offset === 1 ? "stack-middle" : "stack-back");
    card.classList.toggle("active", offset === 0);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === activePhoto);
  });
}

function movePhoto(direction) {
  activePhoto = (activePhoto + direction + cards.length) % cards.length;
  renderPhotoStack();
}

cards.forEach((card, index) => {
  card.addEventListener("click", () => {
    activePhoto = index;
    renderPhotoStack();
  });
});

prev?.addEventListener("click", () => movePhoto(-1));
next?.addEventListener("click", () => movePhoto(1));

function setProfileTimelineExpanded(isExpanded) {
  if (!profileTimeline || !profileTimelineToggle) return;
  profileTimeline.classList.toggle("is-expanded", isExpanded);
  profileTimeline.classList.toggle("is-collapsed", !isExpanded);
  profileTimelineToggle.classList.toggle("is-expanded", isExpanded);
  profileTimelineToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
  profileTimelineToggle.querySelector(".profile-timeline-toggle-copy").textContent = isExpanded
    ? "收起经历"
    : "展开更多经历";
}

profileTimelineToggle?.addEventListener("click", () => {
  setProfileTimelineExpanded(!profileTimeline.classList.contains("is-expanded"));
});

function resetCaseVideo() {
  activeCaseVideoIndex = 0;
  activeVideoProject = null;
  if (caseLightboxVideo) {
    caseLightboxVideo.pause();
    caseLightboxVideo.classList.remove("is-loading");
    caseLightboxVideo.onloadeddata = null;
    caseLightboxVideo.removeAttribute("src");
    caseLightboxVideo.removeAttribute("poster");
    caseLightboxVideo.load();
  }
}

function showCaseVideo(project, index) {
  if (!caseLightboxVideo || !project?.videoSources?.length) return;
  const nextSrc = project.videoSources[(index + project.videoSources.length) % project.videoSources.length];
  const shouldResume = !caseLightboxVideo.paused && !caseLightboxVideo.ended;

  activeVideoProject = project;
  activeCaseVideoIndex = (index + project.videoSources.length) % project.videoSources.length;
  caseLightboxVideo.pause();
  caseLightboxVideo.classList.add("is-loading");
  caseLightboxVideo.onloadeddata = () => {
    caseLightboxVideo.currentTime = 0;
    caseLightboxVideo.classList.remove("is-loading");
    if (shouldResume) {
      caseLightboxVideo.play().catch(() => {});
    }
  };
  caseLightboxVideo.removeAttribute("src");
  caseLightboxVideo.removeAttribute("poster");
  caseLightboxVideo.load();
  caseLightboxVideo.src = nextSrc;
  caseLightboxVideo.title = project.title || "项目视频预览";
  caseLightboxVideo.load();
  if (caseVideoCount) {
    caseVideoCount.textContent = `${String(activeCaseVideoIndex + 1).padStart(2, "0")} / ${String(project.videoSources.length).padStart(2, "0")}`;
  }
}

function moveCaseVideo(direction) {
  if (!activeVideoProject) return;
  showCaseVideo(activeVideoProject, activeCaseVideoIndex + direction);
}

function openCaseLightbox(project) {
  if (!caseLightbox || !caseLightboxImage || !caseLightboxFrame || !caseLightboxPages || !project?.src) return;
  const isPdf = project.type === "pdf";
  const isCasePages = project.type === "case-pages" && Array.isArray(project.pages);
  const isExternalCase = project.type === "external-case";
  const isVideoCarousel = project.type === "video-carousel" && Array.isArray(project.videoSources) && project.videoSources.length > 0;
  const actionHref = project.liveUrl || project.pdfSrc;

  casePreview && (casePreview.hidden = !isExternalCase);
  caseLightboxImage.hidden = isPdf || isCasePages || isExternalCase || isVideoCarousel;
  if (caseVideoCarousel) {
    caseVideoCarousel.hidden = !isVideoCarousel;
  }
  caseLightboxFrame.hidden = !isPdf;
  caseLightboxPages.hidden = !isCasePages;
  if (caseLightboxPdfLink) {
    caseLightboxPdfLink.hidden = !actionHref || isExternalCase;
    caseLightboxPdfLink.textContent = project.liveUrl ? "访问上线网站" : "打开 PDF";
    if (actionHref) {
      caseLightboxPdfLink.href = actionHref;
      caseLightboxPdfLink.setAttribute("aria-label", project.liveUrl ? "访问上线网站" : "打开项目 PDF");
    } else {
      caseLightboxPdfLink.removeAttribute("href");
      caseLightboxPdfLink.removeAttribute("aria-label");
    }
  }

  if (isExternalCase) {
    resetCaseVideo();
    caseLightboxFrame.removeAttribute("src");
    caseLightboxImage.removeAttribute("src");
    caseLightboxPages.replaceChildren();
    if (casePreviewImage) {
      casePreviewImage.src = project.src;
      casePreviewImage.alt = `${project.title} 预览`;
    }
    if (casePreviewEyebrow) casePreviewEyebrow.textContent = project.eyebrow || "";
    if (casePreviewTitle) casePreviewTitle.textContent = project.title || "";
    if (casePreviewDescription) casePreviewDescription.textContent = project.description || "";
    if (casePreviewLiveLink) {
      casePreviewLiveLink.href = project.liveUrl || project.src;
      casePreviewLiveLink.hidden = !project.liveUrl;
    }
    if (casePreviewPdfLink) {
      casePreviewPdfLink.href = project.pdfSrc || project.src;
      casePreviewPdfLink.hidden = !project.pdfSrc;
    }
    casePreviewTags?.replaceChildren(
      ...(project.tags || []).map((tag) => {
        const item = document.createElement("li");
        item.textContent = tag;
        return item;
      })
    );
  } else if (isCasePages) {
    resetCaseVideo();
    caseLightboxFrame.removeAttribute("src");
    caseLightboxImage.removeAttribute("src");
    caseLightboxPages.scrollTop = 0;
    caseLightboxPages.replaceChildren(
      ...project.pages.map((src, index) => {
        const image = document.createElement("img");
        image.src = src;
        image.alt = `${project.title} 第 ${index + 1} 页`;
        image.loading = index < 2 ? "eager" : "lazy";
        return image;
      })
    );
  } else if (isPdf) {
    resetCaseVideo();
    caseLightboxImage.removeAttribute("src");
    caseLightboxPages.replaceChildren();
    caseLightboxFrame.src = project.src;
    caseLightboxFrame.title = project.title || "项目 PDF 预览";
  } else if (isVideoCarousel) {
    caseLightboxFrame.removeAttribute("src");
    caseLightboxPages.replaceChildren();
    caseLightboxImage.removeAttribute("src");
    showCaseVideo(project, 0);
  } else {
    resetCaseVideo();
    caseLightboxFrame.removeAttribute("src");
    caseLightboxPages.replaceChildren();
    caseLightboxImage.src = project.src;
    caseLightboxImage.alt = project.title || "";
  }

  caseLightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCaseLightbox() {
  if (!caseLightbox) return;
  caseLightbox.hidden = true;
  if (casePreview) casePreview.hidden = true;
  casePreviewImage?.removeAttribute("src");
  casePreviewTags?.replaceChildren();
  caseLightboxImage?.removeAttribute("src");
  resetCaseVideo();
  caseLightboxFrame?.removeAttribute("src");
  caseLightboxPages?.replaceChildren();
  document.body.style.overflow = "";
}

function openCaseBrowser() {
  if (!caseBrowser) return;
  caseBrowser.classList.remove("is-collapsed");
  caseBrowser.classList.add("is-open");
  caseFolderTrigger?.setAttribute("aria-expanded", "true");
}

function closeCaseBrowser() {
  if (!caseBrowser) return;
  caseBrowser.classList.add("is-collapsed");
  caseBrowser.classList.remove("is-open");
  caseFolderTrigger?.setAttribute("aria-expanded", "false");
  casePages.forEach((item) => item.classList.remove("is-selected"));
}

function openProjectById(projectId) {
  const page = casePages.find((item) => item.dataset.project === projectId);
  const project = directProjects.find((item) => item.id === projectId);
  if (!page || !project) return false;

  openCaseBrowser();
  casePages.forEach((item) => item.classList.toggle("is-selected", item === page));
  openCaseLightbox(project);
  return true;
}

caseFolderTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  openCaseBrowser();
});

caseBrowser?.addEventListener("click", (event) => {
  if (event.target.closest(".case-page")) return;
  if (caseBrowser.classList.contains("is-collapsed")) {
    openCaseBrowser();
    return;
  }
  closeCaseBrowser();
});

casePages.forEach((page) => {
  page.addEventListener("click", () => {
    if (page.classList.contains("is-selected")) {
      if (caseBrowser?.classList.contains("is-open")) {
        closeCaseBrowser();
        return;
      }
    }
    casePages.forEach((item) => item.classList.toggle("is-selected", item === page));
    const project = directProjects.find((item) => item.id === page.dataset.project);
    const fallbackSrc = page.querySelector("img")?.getAttribute("src");
    const fallbackTitle = page.querySelector(".project-info strong")?.textContent ?? "";
    openCaseLightbox(project ?? { title: fallbackTitle, src: fallbackSrc, type: "image" });
  });
});

const initialProjectId = new URLSearchParams(window.location.search).get("project");
if (initialProjectId) {
  window.setTimeout(() => openProjectById(initialProjectId), 450);
}

caseLightboxClose?.addEventListener("click", closeCaseLightbox);
caseVideoPrev?.addEventListener("click", (event) => {
  event.stopPropagation();
  moveCaseVideo(-1);
});
caseVideoNext?.addEventListener("click", (event) => {
  event.stopPropagation();
  moveCaseVideo(1);
});
caseLightbox?.addEventListener("click", (event) => {
  if (event.target === caseLightbox) {
    closeCaseLightbox();
  }
});

window.addEventListener("scroll", requestHeroUpdate, { passive: true });
window.addEventListener("resize", requestHeroUpdate);
window.addEventListener("wheel", markHeroUserControl, { passive: true });
window.addEventListener("touchmove", markHeroUserControl, { passive: true });
window.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
    markHeroUserControl();
  }
  if (event.key === "Escape") {
    closeCaseLightbox();
  }
});

updateHero();
renderPhotoStack();
