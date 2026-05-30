let globalSiteConfig = null;

// 加载后端配置
async function loadServerTheme() {
  try {
    const res = await fetch('/system/config.json', {cache:"no-cache"});
    if (!res.ok) {
      throw new Error(`接口状态码:${res.status}`);
    }
    const config = await res.json();
    globalSiteConfig = config;

    // 站点标题
    document.title = config.site_title || "交易觉知";
    // 暗黑模式初始化
    const isDark = Boolean(config.dark_mode);
    localStorage.theme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark-mode', isDark);

    // 渲染首页横幅文字
    renderHeroText();
    // 初始化首页视频
    initHeroBanner();
    return config;
  } catch (err) {
    console.warn('读取配置失败', err);
    document.title = "交易觉知";
    if (localStorage.theme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    }
    return null;
  }
}

// 渲染首页标题、副标题（从config读取）
function renderHeroText() {
  if (!globalSiteConfig) return;
  const titleDom = document.querySelector('.hero-title');
  const subDom = document.querySelector('.hero-subtitle');
  if (titleDom) titleDom.innerText = globalSiteConfig.hero_title || "交易觉知";
  if (subDom) subDom.innerText = globalSiteConfig.hero_subtitle || "专注交易认知提升、思维觉醒、策略沉淀 · 让每一次思考都成为盈利的基石";
}

// 页面启动加载配置
loadServerTheme();

// 加载头部模板
fetch('header.html', {cache:"no-cache"}).then(res => res.text()).then(html => {
  const headerDom = document.getElementById('header');
  if (headerDom) {
    headerDom.innerHTML = html;
    loadNavigation();
    setTimeout(() => renderLogoAndSiteInfo(), 120);
  }
});

// 渲染Logo、站点名称描述
function renderLogoAndSiteInfo() {
  if (!globalSiteConfig) return;
  const logoImg = document.querySelector('.logo-img');
  const siteName = document.querySelector('.site-name');
  const siteDesc = document.querySelector('.site-desc');

  if (logoImg && globalSiteConfig.logo_url) {
    logoImg.src = globalSiteConfig.logo_url;
  }
  if (siteName) siteName.innerText = globalSiteConfig.site_name || "";
  if (siteDesc) siteDesc.innerText = globalSiteConfig.site_description || "";
}

// 首页横幅视频渲染（读取hero_video_url，修复视频不渲染）
function initHeroBanner() {
  if (!globalSiteConfig) return;
  const videoEl = document.querySelector('.hero-video');
  const bgEl = document.querySelector('.hero-bg');
  const dots = document.querySelectorAll('.hero-dot');
  const videoUrl = globalSiteConfig.hero_video_url || "";

  if (!videoEl || !bgEl) return;

  if (videoUrl.trim()) {
    videoEl.src = videoUrl;
    videoEl.style.display = "block";
    bgEl.style.display = "none";
    dots.forEach(dot => dot.style.display = "none");
    videoEl.load();
  } else {
    videoEl.style.display = "none";
    bgEl.style.display = "block";
    dots.forEach(dot => dot.style.display = "block");
  }
}

// 加载导航菜单
function loadNavigation() {
  if (globalSiteConfig) {
    renderHeaderNav(globalSiteConfig);
    return;
  }
  fetch('/system/config.json', {cache:"no-cache"})
    .then(resp => {
      if (!resp.ok) throw new Error("配置文件404");
      return resp.json();
    })
    .then(cfg => {
      globalSiteConfig = cfg;
      renderHeaderNav(cfg);
      setTimeout(() => renderLogoAndSiteInfo(), 120);
      renderHeroText();
      initHeroBanner();
    })
    .catch(() => {
      const navWrap = document.getElementById('mainNav');
      navWrap.innerHTML = `
        <a href="index.html">首页</a>
        <a href="setweb.html">软件工具</a>
        <a href="index.html?cat=交易心得">交易心得</a>
        <a href="manager.html">文档管理</a>
        <button id="themeToggle" class="theme-btn"><i class="fa fa-moon-o"></i></button>
      `;
      initThemeToggle();
    });
}

// 渲染导航HTML
function renderHeaderNav(config) {
  const navWrap = document.getElementById('mainNav');
  let navHtml = "";
  config.navigation.menu.forEach(item => {
    if (item.children && item.children.length > 0) {
      navHtml += `<div class="dropdown">
        <a href="${item.url}" class="dropbtn">${item.name} <i class="fa fa-caret-down"></i></a>
        <div class="dropdown-content">`;
      item.children.forEach(child => {
        navHtml += `<a href="${child.url}">${child.name}</a>`;
      });
      navHtml += `</div></div>`;
    } else {
      navHtml += `<a href="${item.url}">${item.name}</a>`;
    }
  });
  navHtml += `<button id="themeToggle" class="theme-btn"><i class="fa fa-moon-o"></i></button>`;
  navWrap.innerHTML = navHtml;
  initThemeToggle();
}

// 明暗切换按钮逻辑
async function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const icon = btn.querySelector('i');
  let config = globalSiteConfig;
  if (!config) config = await loadServerTheme();
  if (!config) return;

  icon.className = config.dark_mode ? 'fa fa-sun-o' : 'fa fa-moon-o';

  btn.onclick = async () => {
    const newDark = !config.dark_mode;
    config.dark_mode = newDark;
    localStorage.theme = newDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark-mode', newDark);
    icon.className = newDark ? 'fa fa-sun-o' : 'fa fa-moon-o';

    try {
      const res = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: config })
      });
      if (res.ok) {
        globalSiteConfig.dark_mode = newDark;
      }
    } catch (e) {
      console.error("主题保存失败", e);
    }
  };
}

// ===================== 文章列表分页逻辑 =====================
const perPage = 12;
let currentPage = 1;
let allFiles = [];
let allCards = [];
let currentCategory = "all";

function getViewCount(file) {
  const key = "view_" + file;
  return parseInt(localStorage.getItem(key) || "0");
}

function addView(file) {
  const key = "view_" + file;
  const count = getViewCount(file);
  localStorage.setItem(key, String(count + 1));
}

document.addEventListener('click', function (e) {
  const cardLink = e.target.closest('.card');
  if (cardLink && cardLink.href) {
    const match = cardLink.href.match(/file=([^&]+)/);
    if (match && match[1]) {
      addView(match[1]);
    }
  }
});

async function getServerMdList() {
  try {
    const res = await fetch("/api/list-md", {cache:"no-cache"});
    if (!res.ok) throw new Error("获取文件列表失败");
    const files = await res.json();
    return Array.isArray(files) ? files : [];
  } catch (e) {
    console.error("获取md文件列表异常", e);
    return [];
  }
}

async function loadAllMD() {
  const validFiles = await getServerMdList();
  const fileTimeList = await Promise.all(
    validFiles.map(async (filename) => {
      try {
        const headRes = await fetch(`/md/${filename}`, { method: "HEAD", cache:"no-cache" });
        const mtime = new Date(headRes.headers.get("last-modified"));
        return { file: filename, t: mtime };
      } catch {
        return { file: filename, t: new Date(0) };
      }
    })
  );
  fileTimeList.sort((a, b) => b.t.getTime() - a.t.getTime());
  allFiles = fileTimeList.map(item => item.file);
  await loadAllCards();
  renderCategoryNav();
  renderList();
}

async function loadAllCards() {
  allCards = [];
  for (const file of allFiles) {
    try {
      const res = await fetch(`/md/${file}`, {cache:"no-cache"});
      const mdText = await res.text();
      const meta = parseMeta(mdText, file);
      allCards.push({ file, meta, md: mdText });
    } catch (err) {
      console.error(`加载文章${file}失败`, err);
    }
  }
}

function parseMeta(mdContent, filename) {
  const meta = {
    title: filename.replace(".md", ""),
    date: "",
    desc: "暂无描述",
    category: "未分类",
    cover: ""
  };
  const text = mdContent.replace(/\r\n/g, "\n");
  const matchResult = text.match(/^---\n([\s\S]*?)\n===/);
  if (matchResult) {
    const lines = matchResult[1].split("\n");
    lines.forEach(line => {
      if (!line.includes(":")) return;
      const splitIndex = line.indexOf(":");
      const key = line.slice(0, splitIndex).trim();
      const val = line.slice(splitIndex + 1).trim();
      switch (key) {
        case "title": meta.title = val; break;
        case "date": meta.date = val; break;
        case "desc": meta.desc = val; break;
        case "category": meta.category = val; break;
        case "cover": meta.cover = val; break;
      }
    });
  }
  if (filename === "sitehelp.md") {
    meta.title = "交易觉知 - 站点帮助";
    meta.desc = "站点使用指南、常见问题解答。";
    meta.category = "站点服务";
  }
  if (filename === "waiver.md") {
    meta.title = "交易觉知 - 免责声明";
    meta.desc = "明确站点权责、用户责任。";
    meta.category = "法律声明";
  }
  return meta;
}

function renderCategoryNav() {
  const categorySet = new Set();
  allCards.forEach(item => categorySet.add(item.meta.category));
  const catList = Array.from(categorySet).sort();
  const navDom = document.getElementById("categoryNav");
  navDom.innerHTML = `<button class="category-btn active" data-cat="all">全部</button>`;
  catList.forEach(cat => {
    navDom.innerHTML += `<button class="category-btn" data-cat="${cat}">${cat}</button>`;
  });
  document.querySelectorAll(".category-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      currentPage = 1;
      renderList();
    };
  });
}

function renderList() {
  const filterCards = currentCategory === "all"
    ? allCards
    : allCards.filter(item => item.meta.category === currentCategory);
  const sliceEnd = currentPage * perPage;
  const showCards = filterCards.slice(0, sliceEnd);
  const loadMoreBtn = document.getElementById("loadMore");
  const cardContainer = document.getElementById("cardList");

  loadMoreBtn.style.display = sliceEnd >= filterCards.length ? "none" : "block";
  cardContainer.innerHTML = "";

  showCards.forEach(item => {
    const meta = item.meta;
    const viewNum = getViewCount(item.file);
    let coverHtml = `<div class="icon"><i class="fa fa-file-text-o"></i></div>`;
    if (meta.cover && meta.cover.trim()) {
      const coverSrc = meta.cover.trim();
      if (coverSrc.endsWith(".mp4") || coverSrc.endsWith(".MP4")) {
        coverHtml = `<div class="card-cover"><video autoplay muted loop playsinline></video></div>`;
      } else {
        coverHtml = `<div class="card-cover"><img src="${coverSrc}" alt="${meta.title}"></div>`;
      }
    } else {
      const imgMatch = item.md.match(/!\[.*?\]\((https?:\/\/.*?\.(png|jpg|jpeg|gif|webp))\)/);
      if (imgMatch && imgMatch[1]) {
        coverHtml = `<div class="card-cover"><img src="${imgMatch[1]}" alt="${meta.title}"></div>`;
      }
    }
    cardContainer.innerHTML += `
      <a class="card" href="read.html?file=${item.file}" target="_blank">
        ${coverHtml}
        <h3>${meta.title || item.file.replace(".md", "")}</h3>
        <p class="desc">${meta.desc || "暂无描述"}</p>
        <div class="meta">
          <span class="tag">${meta.category || "未分类"}</span>
          <span>${meta.date || "未知时间"}</span>
          <span><i class="fa fa-eye"></i> ${viewNum}</span>
        </div>
      </a>
    `;
  });

  setTimeout(() => {
    document.querySelectorAll(".card-cover video").forEach(video => {
      const cardLink = video.closest(".card");
      const fileMatch = cardLink.href.match(/file=([^&]+)/);
      if (!fileMatch) return;
      const targetCard = allCards.find(c => c.file === fileMatch[1]);
      if (targetCard && targetCard.meta.cover) {
        video.src = targetCard.meta.cover;
      }
    });
  }, 50);
}

// 加载更多按钮事件
const loadMoreBtn = document.getElementById("loadMore");
if (loadMoreBtn) {
  loadMoreBtn.onclick = () => {
    currentPage++;
    renderList();
  };
}

// 加载底部 Footer
function loadFooterDom() {
  fetch("footer.html", {cache:"no-cache"})
    .then(r => r.text())
    .then(h => document.getElementById("footer").innerHTML = h)
    .catch(e => console.error("首页footer加载失败", e));
}

// 初始化加载全部文章 + Footer
window.addEventListener("DOMContentLoaded", async () => {
  loadAllMD();
  loadFooterDom();
});