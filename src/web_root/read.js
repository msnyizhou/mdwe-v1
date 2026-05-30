let globalSiteConfig = null;
let headerRendered = false;

// 和index完全一致：加载全局配置
async function loadGlobalConfig() {
  try {
    const res = await fetch('/system/config.json', { cache: "no-cache" });
    if (!res.ok) throw new Error("配置读取失败");
    const config = await res.json();
    globalSiteConfig = config;

    document.title = `阅读 - ${config.site_title || config.site_name || "交易觉知"}`;
    const isDark = Boolean(config.dark_mode);
    localStorage.theme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark-mode', isDark);

    if (headerRendered) {
      renderLogoAndSiteInfo();
      renderHeaderNav(globalSiteConfig);
    }
    return config;
  } catch (err) {
    console.warn('读取配置失败', err);
    document.title = "阅读 - 交易觉知";
    if (localStorage.theme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    }
    return null;
  }
}

// 完全复用index原版Logo、站点名称渲染，无任何内联样式修改
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

// 完全复用index原版导航渲染函数
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
  bindDropdownEvents();
}

// 下拉菜单事件（复刻index逻辑）
function bindDropdownEvents() {
  document.querySelectorAll(".dropbtn").forEach(btn => {
    btn.onclick = function (e) {
      e.stopPropagation();
      const dropBox = this.nextElementSibling;
      document.querySelectorAll(".dropdown-content").forEach(box => {
        if (box !== dropBox) box.style.display = "none";
      });
      dropBox.style.display = dropBox.style.display === "block" ? "none" : "block";
    }
  })
  document.body.onclick = () => {
    document.querySelectorAll(".dropdown-content").forEach(box => box.style.display = "none");
  }
}

// 完全复用index原版暗黑切换逻辑
async function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const icon = btn.querySelector('i');
  let config = globalSiteConfig;
  if (!config) config = await loadGlobalConfig();
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

// 加载header.html模板，无任何内联样式注入
function loadHeaderDom() {
  fetch('header.html', { cache: "no-cache" })
    .then(res => res.text())
    .then(html => {
      const headerDom = document.getElementById('header');
      if (headerDom) {
        headerDom.innerHTML = html;
        headerRendered = true;
        loadNavigation();
        setTimeout(() => renderLogoAndSiteInfo(), 120);
      }
    })
    .catch(err => console.error("header.html加载失败", err));
}

// 导航加载兼容逻辑（完全复刻index）
function loadNavigation() {
  if (globalSiteConfig) {
    renderHeaderNav(globalSiteConfig);
    return;
  }
  fetch('/system/config.json', { cache: "no-cache" })
    .then(resp => {
      if (!resp.ok) throw new Error("配置文件404");
      return resp.json();
    })
    .then(cfg => {
      globalSiteConfig = cfg;
      renderHeaderNav(cfg);
      setTimeout(() => renderLogoAndSiteInfo(), 120);
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
      bindDropdownEvents();
    });
}

// 加载底部Footer
function loadFooterDom() {
  fetch("footer.html", { cache: "no-cache" })
    .then(r => r.text())
    .then(h => document.getElementById("footer").innerHTML = h)
    .catch(e => console.error("footer加载失败", e));
}

// ===================== 文章渲染逻辑（原版保留无修改） =====================
const file = new URLSearchParams(location.search).get("file")
fetch(`md/${file}`, { cache: "no-cache" }).then(r => r.text()).then(md => {
  const meta = { title: file, cover: "" }
  const normalized = md.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\n([\s\S]*?)\n===/)
  if (m) {
    m[1].split("\n").forEach(line => {
      if (!line.includes(':')) return
      const [k, ...v] = line.split(':')
      const key = k.trim()
      const val = v.join(':').trim()
      if (key === 'title') meta.title = val
      if (key === 'cover') meta.cover = val
    })
  }
  document.getElementById("title").innerText = meta.title
  document.getElementById("articleTitle").innerText = meta.title
  const articleCover = document.getElementById("articleCover");
  if (meta.cover && meta.cover.trim()) {
    const cover = meta.cover.trim();
    if (cover.endsWith('.mp4') || cover.endsWith('.MP4')) {
      articleCover.innerHTML = `<video autoplay muted loop playsinline></video>`;
      setTimeout(() => {
        const video = articleCover.querySelector('video');
        if (video) video.src = meta.cover;
      }, 50);
    } else {
      articleCover.innerHTML = `<img src="${cover}">`;
    }
  }
  const content = document.getElementById("content");
  content.innerHTML = marked.parse(normalized.replace(/^---[\s\S]*?\n===\n/, ''), { breaks: true })
})

// ===================== 推荐阅读逻辑（原版保留无修改） =====================
async function loadRecommend() {
  try {
    const res = await fetch("/md-files.json", { cache: "no-cache" })
    const data = await res.json()
    let files = (data.files || []).filter(f => f != file).sort(() => Math.random() - 0.5).slice(0, 3)
    let html = ''
    for (let f of files) {
      let r = await fetch(`md/${f}`, { cache: "no-cache" })
      let md = await r.text()
      let meta = { title: f, date: '', desc: '', category: '未分类', cover: '' }
      let _md = md.replace(/\r\n/g, '\n')
      let match = _md.match(/^---\n([\s\S]*?)\n===/)
      if (match) {
        match[1].split('\n').forEach(line => {
          let [k, ...v] = line.split(':')
          let val = v.join(':').trim()
          if (k.trim() === 'title') meta.title = val
          if (k.trim() === 'date') meta.date = val
          if (k.trim() === 'desc') meta.desc = val
          if (k.trim() === 'category') meta.category = val
          if (k.trim() === 'cover') meta.cover = val
        })
      }
      if (f === "sitehelp.md") {
        meta.title = "交易觉知 - 站点帮助";
        meta.desc = "站点使用指南、常见问题解答。";
        meta.category = "站点服务";
      }
      if (f === "waiver.md") {
        meta.title = "交易觉知 - 免责声明";
        meta.desc = "明确站点权责、用户责任。";
        meta.category = "法律声明";
      }
      let coverHtml = `<div class="icon"><i class="fa fa-file-text-o"></i></div>`
      if (meta.cover && meta.cover.trim()) {
        const cover = meta.cover.trim();
        if (cover.endsWith('.mp4') || cover.endsWith('.MP4')) {
          coverHtml = `<div class="card-cover"><video autoplay muted loop playsinline data-src="${cover}"></video></div>`;
        } else {
          coverHtml = `<div class="card-cover"><img src="${cover}" alt="${meta.title}"></div>`;
        }
      } else {
        const imgMatch = md.match(/!\[.*?\]\((https?:\/\/.*?\.(png|jpg|jpeg|gif|webp))\)/);
        if (imgMatch && imgMatch[1]) {
          coverHtml = `<div class="card-cover"><img src="${imgMatch[1]}" alt="${meta.title}"></div>`;
        }
      }
      html += `
      <a class="card" href="read.html?file=${f}" target="_blank">
        ${coverHtml}
        <h3>${meta.title}</h3>
        <p class="desc">${meta.desc}</p>
        <div class="meta">
          <span class="tag">${meta.category}</span>
          <span>${meta.date}</span>
        </div>
      </a>`;
    }
    const recommendList = document.getElementById("recommendList");
    recommendList.innerHTML = html;
    setTimeout(() => {
      const videos = document.querySelectorAll('.card-cover video');
      videos.forEach(video => {
        video.src = video.dataset.src;
      });
    }, 50);
  } catch (e) { console.error("推荐加载失败", e) }
}

// 页面启动入口，加载全部模块
window.addEventListener("DOMContentLoaded", () => {
  loadHeaderDom();
  loadFooterDom();
  loadRecommend();
  loadGlobalConfig();
})