/**
 * 应用明暗主题样式，切换图标
 * @param {boolean} isDark 是否暗黑模式
 */
function applyTheme(isDark) {
  document.documentElement.classList.toggle('dark-mode', isDark);
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;
  const icon = toggleBtn.querySelector('i');
  icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
}

/**
 * 初始化主题切换点击事件
 */
function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  if (!toggleBtn) return;

  fetch('/system/config.json')
    .then(res => res.json())
    .then(cfg => {
      // 页面初始化应用存储的主题
      applyTheme(cfg.dark_mode);

      // 点击切换黑白主题并保存到后端
      toggleBtn.onclick = async () => {
        cfg.dark_mode = !cfg.dark_mode;
        const saveResponse = await fetch('/api/save-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config: cfg })
        });
        const saveResult = await saveResponse.json();
        if (saveResult.success) {
          applyTheme(cfg.dark_mode);
        }
      };
    });
}

/**
 * 加载全局配置，渲染header全部内容：Logo、标题、描述、导航菜单
 */
function loadHeaderConfig() {
  fetch('/system/config.json')
    .then(response => response.json())
    .then(config => {
      // 1. 动态替换Logo图片地址（读取config.logo_url）
      const logoImageDom = document.querySelector('.logo-img');
      if (logoImageDom && config.logo_url) {
        logoImageDom.src = config.logo_url;
      }

      // 2. 渲染站点名称、站点描述
      document.querySelector('.site-name').innerText = config.site_name;
      document.querySelector('.site-desc').innerText = config.site_description;

      // 3. 渲染导航菜单（一级/二级下拉菜单）
      const navContainer = document.getElementById('mainNav');
      let navHtml = '';
      config.navigation.menu.forEach(item => {
        if (item.children && item.children.length > 0) {
          // 二级下拉菜单
          navHtml += `<div class="dropdown">
            <a href="${item.url}" class="dropbtn">${item.name} <i class="fa fa-caret-down"></i></a>
            <div class="dropdown-content">`;
          item.children.forEach(child => {
            navHtml += `<a href="${child.url}">${child.name}</a>`;
          });
          navHtml += `</div></div>`;
        } else {
          // 普通一级菜单
          navHtml += `<a href="${item.url}">${item.name}</a>`;
        }
      });
      // 追加主题切换按钮
      navHtml += `<button id="themeToggle" class="theme-btn"><i class="fa fa-moon-o"></i></button>`;
      navContainer.innerHTML = navHtml;

      // 初始化主题切换功能
      initThemeToggle();
    })
    .catch(error => {
      console.error('Header加载配置文件失败：', error);
      // 加载失败兜底默认导航
      const navContainer = document.getElementById('mainNav');
      navContainer.innerHTML = `
        <a href="index.html">首页</a>
        <a href="index.html?cat=软件工具">软件工具</a>
        <a href="index.html?cat=交易心得">交易心得</a>
        <a href="manager.html">文档管理</a>
        <button id="themeToggle" class="theme-btn"><i class="fa fa-moon-o"></i></button>
      `;
      initThemeToggle();
    });
}

// DOM加载完成后执行Header渲染逻辑
window.addEventListener('DOMContentLoaded', loadHeaderConfig);