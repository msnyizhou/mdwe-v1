let currentFile = "";
let allCategories = [];
let currentColor = "#000000"; // 默认黑色
let colorName = "黑色";

const middle = document.getElementById("editPanel");
const dragBar = document.getElementById("dragBar");
let isDragging = false;
dragBar.addEventListener("mousedown", () => { isDragging = true; document.body.style.cursor = "col-resize"; });
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  const w = document.body.clientWidth - 240;
  const p = Math.max(20, Math.min(80, (e.clientX - 240) / w * 100));
  middle.style.width = p + "%";
});
document.addEventListener("mouseup", () => { isDragging = false; document.body.style.cursor = ""; });

function showToast(msg, success = true) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.style.background = success ? "#28a745" : "#dc3545";
  t.innerHTML = `<i class="fa ${success ? "fa-check-circle" : "fa-exclamation-circle"}"></i><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const editor = document.getElementById("editor");
function insert(text) {
  const s = editor.selectionStart;
  editor.value = editor.value.substring(0, s) + text + editor.value.substring(s);
  editor.focus();
  editor.selectionStart = editor.selectionEnd = s + text.length;
  updatePreview();
}
function wrapSelection(l, r) {
  const s = editor.selectionStart;
  const e = editor.selectionEnd;
  const t = editor.value.substring(s, e);
  editor.value = editor.value.substring(0, s) + l + t + r + editor.value.substring(e);
  editor.focus();
  editor.selectionStart = s + l.length;
  editor.selectionEnd = e + l.length;
  updatePreview();
}

// 插入链接
function insertLink() {
  const text = prompt("链接文字：");
  if (!text) return;
  const url = prompt("链接地址URL：");
  if (!url) return;
  insert(`[${text}](${url})`);
}

// 字体颜色（默认黑色）
function openColorPicker() {
  document.getElementById("colorPicker").click();
}
function setTextColor() {
  const colorPicker = document.getElementById("colorPicker");
  currentColor = colorPicker.value;
  
  const names = {
    "#000000":"黑色", "#ff0000":"红色", "#00ff00":"绿色", "#0000ff":"蓝色",
    "#ffff00":"黄色", "#ff00ff":"粉色", "#ffffff":"白色"
  };
  colorName = names[currentColor] || "自定义颜色";
  
  document.getElementById("colorDot").style.background = currentColor;
  document.getElementById("colorBtn").innerHTML = `
    <span class='color-dot' style='background:${currentColor};'></span>
    字体颜色（${colorName}）
  `;
  wrapSelection(`<span style="color:${currentColor};">`, `</span>`);
}

function insertImg() {
  const url = prompt("图片URL：");
  if (!url) return;
  const width = prompt("图片宽度（默认 100%）", "100%");
  const height = prompt("图片高度（默认 auto）", "auto");
  const imgCode = `<img src="${url}" style="width:${width};height:${height};border-radius:8px;max-width:100%;">`;
  insert(imgCode);
}

function insertTable() {
  const table = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
`;
  insert(table);
}

function insertVideo() {
  const u = prompt("视频m3u8地址：");
  if (!u) return;
  const code = `
<video controls style="width:100%;border-radius:12px;">
  <source src="${u}" type="application/x-mpegURL">
</video>
`;
  insert(code);
}

function insertAudio() {
  const u = prompt("音频mp3地址：");
  if (!u) return;
  const code = `
<audio controls style="width:100%;border-radius:8px;">
  <source src="${u}" type="audio/mpeg">
</audio>
`;
  insert(code);
}

function insertCode() {
  insert("```js\n// 代码\n```");
}

function updatePreview() {
  const src = editor.value.replace(/\r\n/g, '\n');
  document.getElementById("preview").innerHTML = marked.parse(src, {breaks: true});
}

async function loadAllCategories() {
  try {
    const res = await fetch("/api/list-md");
    const files = await res.json() || [];
    const cats = new Set();
    for (const f of files) {
      try {
        const r = await fetch(`/md/${f}`);
        const txt = await r.text();
        const _txt = txt.replace(/\r\n/g, '\n');
        const m = _txt.match(/^---\n([\s\S]*?)\n===/);
        if (m) {
          m[1].split("\n").forEach(line => {
            if (line.startsWith("category:")) {
              const c = line.split(":")[1].trim();
              if (c) cats.add(c);
            }
          });
        }
      } catch (e) {}
    }
    const datalist = document.getElementById("categoryList");
    datalist.innerHTML = "";
    Array.from(cats).sort().forEach(c => {
      datalist.innerHTML += `<option value="${c}">`;
    });
  } catch (e) {}
}

async function loadFileList() {
  const res = await fetch("/api/list-md?t="+Date.now());
  const files = await res.json();
  const list = document.getElementById("fileList");
  list.innerHTML = "";
  files.forEach(f=>{
    const d = document.createElement("div");
    d.className = "file-item";
    d.textContent = f;
    d.onclick = ()=>openFile(f);
    list.appendChild(d);
  });
}

async function openFile(file) {
  currentFile = file;
  const r = await fetch(`/md/${file}`);
  const txt = await r.text();
  filename.value = file;

  const meta = {title:"",category:"",date:"",desc:"",cover:""};
  // 兼容 CRLF (\r\n) 和 LF (\n) 换行符
  const normalized = txt.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\n([\s\S]*?)\n===/);
  let body = normalized;
  if(m) {
    m[1].split("\n").forEach(line=>{
      const [k,...v] = line.split(":");
      const val = v.join(":").trim();
      if(k==="title") meta.title=val;
      if(k==="category") meta.category=val;
      if(k==="date") meta.date=val;
      if(k==="desc") meta.desc=val;
      if(k==="cover") meta.cover=val;
    });
    body = normalized.replace(m[0],"").trim();
  }
  title.value = meta.title;
  categoryInput.value = meta.category;
  date.value = meta.date;
  desc.value = meta.desc;
  cover.value = meta.cover;
  editor.value = body;
  updatePreview();
}

function newFile() {
  currentFile="";
  filename.value="";
  title.value="";
  categoryInput.value="";
  date.value="";
  desc.value="";
  cover.value="";
  editor.value="";
  updatePreview();
}

// 智能新建/打开 当日交易日志
async function newTradeLog() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const dateStr = `${y}-${m}-${d}`;
  const dateShow = `${m}.${d}.${y}`;
  const todayFile = `${dateStr}td.md`;

  const res = await fetch("/api/list-md");
  const files = await res.json() || [];
  
  if (files.includes(todayFile)) {
    showToast("今日日志已存在，直接打开 ✅");
    openFile(todayFile);
    return;
  }

  newFile();
  filename.value = todayFile;
  title.value = `交易记录${dateShow}`;
  categoryInput.value = "交易日志";
  date.value = dateStr;
  desc.value = `交易日志记录${dateShow}`;
  editor.value = `## 软件开启：
## 交易开单记录：
### 开单1、`;
  updatePreview();
  showToast("今日交易日志已创建 ✅");
}

async function saveFile() {
  const file = filename.value.trim();
  if(!file.endsWith(".md")) { showToast("必须 .md 结尾",0); return; }

  const titleVal = title.value.trim() || file.replace(".md","");
  const catVal = categoryInput.value.trim() || "未分类";
  const dateVal = date.value.trim() || new Date().toISOString().split("T")[0];
  const descVal = desc.value.trim() || "暂无描述";
  const coverVal = cover.value.trim();
  const body = editor.value.trim();

  const head = `---
title: ${titleVal}
category: ${catVal}
date: ${dateVal}
desc: ${descVal}
cover: ${coverVal}
===

`;
  const full = head + body;

  const r = await fetch("/api/save-md",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({file, content:full})
  });
  if(r.ok) { showToast("保存成功 ✅"); loadFileList(); loadAllCategories(); openFile(file); }
  else showToast("保存失败",0);
}

async function deleteFile() {
  if(!currentFile) return showToast("请选择文件");
  if(!confirm("确定删除？")) return;
  await fetch("/api/delete-md",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({file:currentFile})
  });
  newFile();
  loadFileList();
  loadAllCategories();
  showToast("删除成功");
}

const uploadProgress = document.getElementById("uploadProgress");
const progressBar = document.getElementById("progressBar");

async function pasteUploadImage() {
  try {
    const items = await navigator.clipboard.read();
    let blob = null;
    for(let item of items){
      if(item.types.includes("image/png") || item.types.includes("image/jpeg")){
        blob = await item.getType("image/png");
        break;
      }
    }
    if(!blob){ showToast("剪贴板无图片",false); return; }

    uploadProgress.style.display = "block";
    const xhr = new XMLHttpRequest();
    xhr.open("POST","/api/upload-image");
    xhr.upload.onprogress = e=>{
      if(e.lengthComputable) progressBar.style.width = (e.loaded/e.total*100)+"%";
    };
    xhr.onload = ()=>{
      uploadProgress.style.display = "none";
      if(xhr.status===200){
        const resp = JSON.parse(xhr.responseText);
        insert(`![图片](${resp.url})`);
        showToast("上传成功");
      }else{
        showToast("上传失败");
      }
    };
    xhr.send(blob);
  }catch(e){
    uploadProgress.style.display = "none";
    showToast("请在编辑框使用 Ctrl+V 粘贴");
  }
}

editor.addEventListener("paste", function(e) {
  const items = e.clipboardData.items;
  let blob = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      blob = items[i].getAsFile();
      break;
    }
  }
  if (!blob) return;
  e.preventDefault();
  uploadProgress.style.display = "block";

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/upload-image");
  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
      progressBar.style.width = (e.loaded / e.total * 100) + "%";
    }
  };
  xhr.onload = function() {
    uploadProgress.style.display = "none";
    if (xhr.status === 200) {
      const resp = JSON.parse(xhr.responseText);
      insert(`![图片](${resp.url})`);
      showToast("粘贴上传成功 ✅");
      navigator.clipboard.writeText('');
    } else {
      showToast("上传失败");
    }
  };
  xhr.send(blob);
});

async function fetchCoverImage() {
  const btn = document.getElementById("fetchCoverBtn");
  const fname = document.getElementById("filename").value.trim();
  if (!fname) {
    showToast("请先填写文件名", false);
    return;
  }
  if (!fname.endsWith(".md")) {
    showToast("文件名必须是 .md 格式", false);
    return;
  }

  btn.disabled = true;
  btn.textContent = "获取中...";
  try {
    const res = await fetch("/api/fetch-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: fname })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById("cover").value = data.path;
      showToast("封面获取成功 ✅");
    } else {
      showToast(data.error || "获取失败", false);
    }
  } catch (err) {
    showToast("请求失败：" + err, false);
  } finally {
    btn.disabled = false;
    btn.textContent = "获取封面";
  }
}

editor.addEventListener("input", updatePreview);
window.onload = async () => {
  await loadFileList();
  await loadAllCategories();
  newFile();
};

// ========== 关系图谱 ==========
let scene, camera, renderer, controls
let graphNodes = []
let graphLines = []
let graphMouse = new THREE.Vector2()
let graphRaycaster = new THREE.Raycaster()
let graphDragNode = null
let graphAllData = {files:[], metas:{}, categories:[]}
let graphHoverNode = null

function getSpherePoint(r) {
  const u=Math.random(),v=Math.random();
  const th=2*Math.PI*u,ph=Math.acos(2*v-1);
  return new THREE.Vector3(r*Math.sin(ph)*Math.cos(th),r*Math.sin(ph)*Math.sin(th),r*Math.cos(ph));
}
function getNearPoint(c, d){return c.clone().add(new THREE.Vector3((Math.random()-0.5)*d,(Math.random()-0.5)*d,(Math.random()-0.5)*d*0.5));}
function generateRelatedColor(hue=null){
  let h=hue??Math.random()*360;
  if(hue)h=(h+(Math.random()-0.5)*30)%360;
  const s=70+Math.random()*25,l=50+Math.random()*20;
  const rgb=hslToRgb(h/360,s/100,l/100);
  return (rgb[0]<<16)|(rgb[1]<<8)|rgb[2];
}
function hslToRgb(h,s,l){let r,g,b;const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;const h2=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};r=h2(p,q,h+1/3);g=h2(p,q,h);b=h2(p,q,h-1/3);return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
function initGraph(){
  const c=document.getElementById("graphCanvas");if(!c)return;
  const rect=c.getBoundingClientRect();
  scene=new THREE.Scene();scene.background=new THREE.Color(0x111827);
  camera=new THREE.PerspectiveCamera(60,rect.width/rect.height,0.1,5000);camera.position.z=220;
  renderer=new THREE.WebGLRenderer({canvas:c,antialias:true});renderer.setSize(rect.width,rect.height);
  controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  scene.add(new THREE.PointLight(0xffffff,1));
}
function clearLabels(){document.querySelectorAll(".graph-label").forEach(e=>e.remove())}
function createLabel(nm,name){const el=document.createElement("div");el.className="graph-label";el.textContent=name;document.getElementById("graphModal").appendChild(el);nm.label=el}
function updateLabels(){const r=document.getElementById("graphCanvas").getBoundingClientRect();graphNodes.forEach(n=>{const v=n.mesh.position.clone();v.project(camera);const x=(v.x*0.5+0.5)*r.width,y=(-v.y*0.5+0.5)*r.height+18;n.label.style.left=x+"px";n.label.style.top=y+"px"})}
async function loadGraphAllData(){
  const res=await fetch("/api/list-md"),files=await res.json(),md=files.filter(f=>f.endsWith(".md")),meta={};
  const cat=new Set();for(const f of md){const t=await fetch(`/md/${f}`),tx=await t.text();const _tx=tx.replace(/\r\n/g,'\n');const m=_tx.match(/^---\n([\s\S]*?)\n===/);const c={category:"未分类"};if(m)m[1].split("\n").forEach(l=>{const [k,...v]=l.split(":");const val=v.join(":").trim();if(k==="category")c.category=val;});meta[f]=c;cat.add(c.category);}
  graphAllData={files:md,metas:meta,categories:Array.from(cat)};
}
function resetGraphVisuals(){graphNodes.forEach(n=>{n.mesh.material.color.setHex(n.type==='cat'?n.color:0xffffff);n.mesh.material.opacity=1;});graphLines.forEach(l=>{l.line.material.color.setHex(l.oc);l.line.material.opacity=l.oo;})}
function highlightGraphNode(n){resetGraphVisuals();const v=new Set();function trav(x){if(v.has(x))return;v.add(x);x.mesh.material.color.setHex(0xffd166);x.links.forEach(t=>{trav(t);const li=graphLines.find(a=>(a.a===x&&a.b===t)||(a.a===t&&a.b===x));if(li){li.line.material.color.setHex(0xffd166);li.line.material.opacity=1;}})}trav(n);}
async function buildFullNebula(){
  graphNodes=[];graphLines=[];if(!scene)return;scene.clear();clearLabels();await loadGraphAllData();
  const cm=new Map(),cl=new Map();graphAllData.categories.forEach(c=>cl.set(c,new Set()));
  for(const f of graphAllData.files){const t=await fetch(`/md/${f}`),tx=await t.text();const m=[...tx.matchAll(/\[\[(.*?)\]\]/g)];m.forEach(s=>{const tg=s[1].trim()+".md";const fa=graphAllData.metas[f]?.category,fb=graphAllData.metas[tg]?.category;if(fa&&fb&&fa!==fb){cl.get(fa).add(fb);cl.get(fb).add(fa);}});}
  const hueMap=new Map();graphAllData.categories.forEach(c=>{let rh=null;cl.get(c).forEach(x=>{if(hueMap.has(x))rh=hueMap.get(x);});const co=generateRelatedColor(rh);hueMap.set(c,((co>>16)&0xff)*0.3+((co>>8)&0xff)*0.59+(co&0xff)*0.11);const m=new THREE.Mesh(new THREE.SphereGeometry(5,16,16),new THREE.MeshBasicMaterial({color:co}));m.position.copy(getSpherePoint(110));scene.add(m);const node={type:'cat',name:c,mesh:m,color:co,links:[],originPos:m.position.clone(),velocity:new THREE.Vector3()};graphNodes.push(node);createLabel(node,c);cm.set(c,node);});
  const fm=new Map();graphAllData.files.forEach(f=>{const m=graphAllData.metas[f],cn=cm.get(m.category),s=Math.max(1.4,Math.min(2.8,10/16));const me=new THREE.Mesh(new THREE.SphereGeometry(s,16,16),new THREE.MeshBasicMaterial({color:0xffffff}));me.position.copy(getNearPoint(cn.originPos,35));scene.add(me);const node={type:'file',name:f.replace(".md",""),mesh:me,cat:m.category,links:[],originPos:me.position.clone(),velocity:new THREE.Vector3(),catNode:cn};graphNodes.push(node);createLabel(node,f.replace(".md",""));fm.set(f.replace(".md",""),node);});
  graphNodes.forEach(n=>{if(n.type==='file'){const c=cm.get(n.cat);if(c){n.links.push(c);c.links.push(n);const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([n.mesh.position,c.mesh.position]),new THREE.LineBasicMaterial({color:c.color,opacity:0.5,transparent:true}));scene.add(l);graphLines.push({line:l,a:n,b:c,oc:c.color,oo:0.5});}}});
  for(const f of graphAllData.files){const a=fm.get(f.replace(".md",""));if(!a)continue;const t=await fetch(`/md/${f}`),tx=await t.text();const m=[...tx.matchAll(/\[\[(.*?)\]\]/g)];m.forEach(s=>{const b=fm.get(s[1].trim());if(b&&a!==b&&!a.links.includes(b)){a.links.push(b);b.links.push(a);const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.mesh.position,b.mesh.position]),new THREE.LineBasicMaterial({color:0x818cf8,opacity:0.5,transparent:true}));scene.add(l);graphLines.push({line:l,a:a,b:b,oc:0x818cf8,oo:0.5});}});}
}
function updateGraphPhysics(){
  if(graphDragNode)return;
  const STIFFNESS=0.025,DAMPING=0.92,CAT_ATTRACTION=0.03,LINK_ATTRACTION=0.05,ARTICLE_LINK_FORCE=0.08;
  graphNodes.forEach(n=>{
    const f=new THREE.Vector3();
    f.add(n.originPos.clone().sub(n.mesh.position).multiplyScalar(STIFFNESS));
    if(n.type==='cat'){
      graphNodes.forEach(o=>{if(o.type==='cat'&&o!==n){f.add(o.mesh.position.clone().sub(n.mesh.position).normalize().multiplyScalar(CAT_ATTRACTION));}});
    }
    if(n.type==='file'){
      n.links.forEach(link=>{if(link&&link.type==='file')f.add(link.mesh.position.clone().sub(n.mesh.position).normalize().multiplyScalar(ARTICLE_LINK_FORCE));});
    }
    n.velocity.add(f).multiplyScalar(DAMPING);
    n.mesh.position.add(n.velocity);
  });
}
function updateGraphLines(){graphLines.forEach(l=>l.line.geometry.setFromPoints([l.a.mesh.position,l.b.mesh.position]));}

function onGraphMouseDown(){
  graphRaycaster.setFromCamera(graphMouse,camera);
  const i=graphRaycaster.intersectObjects(graphNodes.map(x=>x.mesh));
  graphDragNode=i.length?graphNodes.find(x=>x.mesh===i[0].object):null;
}
function onGraphMouseUp(){graphDragNode=null;}
function onGraphMouseMove(e){
  const r=document.getElementById("graphCanvas").getBoundingClientRect();
  graphMouse.x=((e.clientX-r.left)/r.width)*2-1;
  graphMouse.y=-((e.clientY-r.top)/r.height)*2+1;
  graphRaycaster.setFromCamera(graphMouse,camera);
  // 图谱未初始化时 graphNodes 为空，跳过
  if (!graphNodes || graphNodes.length === 0) return;
  const isc=graphRaycaster.intersectObjects(graphNodes.map(x=>x.mesh));
  if(isc.length>0){const h=graphNodes.find(x=>x.mesh===isc[0].object);if(h!==graphHoverNode){graphHoverNode=h;highlightGraphNode(h);}}else if(graphHoverNode){graphHoverNode=null;resetGraphVisuals();}
  if(!graphDragNode)return;
  const vec=new THREE.Vector3(graphMouse.x,graphMouse.y,0.5).unproject(camera);
  const dir=vec.sub(camera.position).normalize();
  const pos=camera.position.clone().add(dir.multiplyScalar(220));
  graphDragNode.mesh.position.copy(pos);
  function follow(node,depth){if(depth>3)return;node.links.forEach(link=>{link.mesh.position.lerp(pos.clone().lerp(link.originPos,0.7),0.15);follow(link,depth+1);});}
  follow(graphDragNode,1);
  updateGraphLines();
}
function animateGraph(){requestAnimationFrame(animateGraph);updateGraphPhysics();updateGraphLines();if(controls)controls.update();updateLabels();if(renderer&&scene&&camera)renderer.render(scene,camera);}

async function openGraph(){
  document.getElementById("graphModal").style.display="block";
  if(!scene){initGraph();await buildFullNebula();animateGraph();}
  setTimeout(()=>{if(controls)controls.update();},100);
}
function closeGraph(){document.getElementById("graphModal").style.display="none";}

document.getElementById("graphCanvas").addEventListener("mousedown",onGraphMouseDown)
document.addEventListener("mousemove",onGraphMouseMove)
document.addEventListener("mouseup",onGraphMouseUp)