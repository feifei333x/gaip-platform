
const STORAGE_KEY = "gaip_demo_state_v1";
const AUTO_BASE_URL = (() => {
  const p = window.location.pathname.replace(/\/index\.html$/, '');
  return `${window.location.origin}${p}`;
})();
const DEFAULT_BASE_URL = AUTO_BASE_URL || "https://your-domain.example/gaip-platform";
const DEMO_USERS = [
  {id:1, username:"teacher01", password:"Teacher@123", role:"teacher", displayName:"任课教师"},
  {id:2, username:"student01", password:"Student@123", role:"student", displayName:"学生甲"},
  {id:3, username:"student02", password:"Student@123", role:"student", displayName:"学生乙"},
  {id:4, username:"student03", password:"Student@123", role:"student", displayName:"学生丙"},
  {id:5, username:"admin01", password:"Admin@123", role:"admin", displayName:"系统管理员"}
];
const DEFAULT_TASKS = [
  {id:1, title:"任务1：销售数据诊断与经营建议", objective:"识别销售波动特征，形成经营建议。", datasetHint:"上传CSV销售数据后生成可视化与报告。", dueDate:"2026-04-20"},
  {id:2, title:"任务2：客户画像与运营优化", objective:"基于用户数据进行分群并给出运营建议。", datasetHint:"支持上传用户行为数据样例。", dueDate:"2026-04-25"}
];
let state = loadState();
let currentUser = null;

function seedDemo(){
  state = {
    baseUrl: DEFAULT_BASE_URL,
    users: structuredClone(DEMO_USERS),
    tasks: structuredClone(DEFAULT_TASKS),
    comments: [],
    submissions: []
  };
  saveState();
  renderAll();
  toast("已恢复演示数据。");
}

function loadState(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved) return JSON.parse(saved);
  const initial = {baseUrl:DEFAULT_BASE_URL, users:DEMO_USERS, tasks:DEFAULT_TASKS, comments:[], submissions:[]};
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function escapeHtml(str=""){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function toast(msg){
  alert(msg);
}
function login(username, password){
  const user = state.users.find(u => u.username === username && u.password === password);
  if(!user){ toast("账号或密码错误。"); return; }
  currentUser = user;
  sessionStorage.setItem("gaip_current_user", JSON.stringify(user));
  renderAll();
}
function logout(){
  currentUser = null;
  sessionStorage.removeItem("gaip_current_user");
  renderAll();
}
function getCurrent(){
  const raw = sessionStorage.getItem("gaip_current_user");
  currentUser = raw ? JSON.parse(raw) : null;
  return currentUser;
}
function getTaskById(id){
  return state.tasks.find(t => Number(t.id) === Number(id));
}
function getComments(taskId){
  return state.comments.filter(c => Number(c.taskId) === Number(taskId)).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
}
function getUser(id){ return state.users.find(u=>u.id===id); }
function getSubmissionsByTask(taskId){ return state.submissions.filter(s=>Number(s.taskId)===Number(taskId)); }
function getSubmission(taskId, studentId){
  return [...state.submissions].reverse().find(s => Number(s.taskId)===Number(taskId) && Number(s.studentId)===Number(studentId));
}
function taskLink(taskId){
  return `${state.baseUrl.replace(/\/$/,'')}/index.html?role=student&task=${taskId}`;
}
function qrPath(taskId){
  return `assets/qr-task-${taskId}.png`;
}
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map(s=>s.trim());
  const rows = lines.slice(1).map(line=>{
    const cells = line.split(",").map(v=>v.trim());
    const row = {};
    headers.forEach((h,i)=> row[h]=cells[i] ?? "");
    return row;
  });
  const numericCols = headers.filter(h => rows.every(r => r[h] !== "" && !isNaN(Number(r[h]))));
  const stats = {};
  numericCols.slice(0,6).forEach(col => {
    const arr = rows.map(r => Number(r[col]));
    const sum = arr.reduce((a,b)=>a+b,0);
    stats[col] = {
      "均值": (sum/arr.length).toFixed(2),
      "最大值": Math.max(...arr).toFixed(2),
      "最小值": Math.min(...arr).toFixed(2)
    };
  });
  return {
    preview: rows.slice(0,8),
    summary: {rows: rows.length, columns: headers.length, fields: headers, numericColumns: numericCols},
    stats
  };
}
function generateAI(task, summary, stats, question){
  const fields = (summary.fields || []).slice(0,6).join("、") || "暂无字段";
  const numeric = (summary.numericColumns || []).slice(0,4).join("、") || "暂无数值字段";
  const firstKey = Object.keys(stats)[0];
  return [
    `围绕任务“${task.title}”，建议先完成数据质量检查，识别缺失值与异常值。`,
    `当前数据样本量约为 ${summary.rows} 条，字段包括：${fields}。`,
    `建议重点关注的数值型字段有：${numeric}。`,
    firstKey ? `可优先解释字段“${firstKey}”的波动特征，并将其与业务现象相联系。` : "当前上传数据未识别出可统计分析的数值型字段。",
    `针对您的提问“${question}”，平台建议按“现象识别—原因分析—管理建议—实施优先级”四步形成结论。`,
    `AI生成内容应作为提示线索，最终结论需由学生结合课程理论进行二次修订。`
  ].join("\n");
}
function generateReport(task, summary, stats, aiText, user){
  let statLines = Object.keys(stats).length
    ? Object.entries(stats).map(([k,v]) => `${k}：均值 ${v["均值"]}，最大值 ${v["最大值"]}，最小值 ${v["最小值"]}`).join("\n")
    : "未识别到可用于统计分析的数值型字段。";
  return `《${task.title}》实验报告

提交人：${user.displayName}
生成时间：${new Date().toLocaleString()}

一、实验目标
${task.objective}

二、数据概况
样本量：${summary.rows}；字段数：${summary.columns}；主要字段：${summary.fields.slice(0,8).join("、")}

三、关键统计信息
${statLines}

四、生成式AI辅助分析提示
${aiText}

五、管理决策建议
1. 从关键指标中识别异常波动点，并结合业务场景解释原因；
2. 通过对比分析和趋势判断提出可执行的经营改进方案；
3. 将AI生成结果与课程理论相结合，完成二次修订与反思。

六、结论
本实验通过“数据分析—AI提示—协作讨论—报告生成—教师反馈”的完整流程，形成了管理决策能力训练的闭环。`;
}
function renderAll(){
  getCurrent();
  if(state.baseUrl !== AUTO_BASE_URL && AUTO_BASE_URL && !/your-domain\.example/.test(AUTO_BASE_URL)){
    state.baseUrl = AUTO_BASE_URL;
    saveState();
  }
  document.getElementById("footerBaseUrl").textContent = `BASE_URL：${state.baseUrl}`;
  document.getElementById("loginView").classList.toggle("hidden", !!currentUser);
  document.getElementById("appView").classList.toggle("hidden", !currentUser);

  const top = document.getElementById("topUserArea");
  if(!currentUser){
    top.innerHTML = "";
    return;
  }
  top.innerHTML = `<span>${currentUser.displayName}（${currentUser.role}）</span><button class="btn ghost" onclick="logout()">退出</button>`;
  document.querySelectorAll(".role-view").forEach(v => v.classList.add("hidden"));

  if(currentUser.role === "teacher"){
    document.getElementById("roleTitle").textContent = "教师端仪表板";
    document.getElementById("roleDesc").textContent = "用于建课、发任务、生成二维码入口、查看提交记录并进行评分反馈。";
    document.getElementById("teacherView").classList.remove("hidden");
    renderTeacher();
  } else if(currentUser.role === "student"){
    document.getElementById("roleTitle").textContent = "学生端任务中心";
    document.getElementById("roleDesc").textContent = "支持扫码进入任务、上传CSV、获取AI分析提示、协作讨论并生成实验报告。";
    document.getElementById("studentView").classList.remove("hidden");
    renderStudent();
    autoOpenTaskFromQuery();
  } else {
    document.getElementById("roleTitle").textContent = "管理员概览";
    document.getElementById("roleDesc").textContent = "用于展示平台账号、任务与提交总量。";
    document.getElementById("adminView").classList.remove("hidden");
    renderAdmin();
  }
}
function renderTeacher(){
  const taskWrap = document.getElementById("teacherTasks");
  taskWrap.innerHTML = state.tasks.map(t => {
    const subs = getSubmissionsByTask(t.id);
    return `<div class="task-card">
      <h3>${escapeHtml(t.title)}</h3>
      <div class="task-meta"><span>截止：${t.dueDate}</span><span>提交数：${subs.length}</span></div>
      <div>${escapeHtml(t.objective)}</div>
      <div class="qr-box">
        <img src="${qrPath(t.id)}" onerror="this.style.display='none'"/>
        <div>
          <div><strong>二维码入口链接</strong></div>
          <div class="muted">${taskLink(t.id)}</div>
          <div class="actions"><a class="btn ghost" href="${taskLink(t.id)}" target="_blank">打开学生入口</a></div>
        </div>
      </div>
    </div>`;
  }).join("");

  const subWrap = document.getElementById("teacherSubmissions");
  const allSubs = [...state.submissions].sort((a,b)=> new Date(b.submittedAt)-new Date(a.submittedAt));
  if(!allSubs.length){ subWrap.innerHTML = `<div class="muted">暂无学生提交。</div>`; return; }
  subWrap.innerHTML = allSubs.map(s => {
    const user = getUser(s.studentId);
    const task = getTaskById(s.taskId);
    return `<div class="submission-card">
      <div><strong>${user.displayName}</strong> - ${task.title}</div>
      <div class="task-meta"><span>${s.submittedAt}</span><span>${s.filename || "未记录文件名"}</span></div>
      <details><summary>查看实验报告</summary><div class="report">${escapeHtml(s.reportText)}</div></details>
      <div class="score-box">
        <label>评分<input type="number" min="0" max="100" value="${s.score || ""}" onchange="updateScore(${s.id}, this.value, null)"></label>
        <label>反馈<textarea rows="3" onchange="updateScore(${s.id}, null, this.value)">${escapeHtml(s.feedback || "")}</textarea></label>
      </div>
    </div>`;
  }).join("");
}
function updateScore(id, score, feedback){
  const sub = state.submissions.find(s=>s.id===id);
  if(!sub) return;
  if(score !== null) sub.score = Number(score);
  if(feedback !== null) sub.feedback = feedback;
  saveState();
}
function renderStudent(){
  const tasksHtml = state.tasks.map(t => {
    const mySub = getSubmission(t.id, currentUser.id);
    return `<div class="task-card">
      <h3>${escapeHtml(t.title)}</h3>
      <div>${escapeHtml(t.objective)}</div>
      <div class="task-meta"><span>截止：${t.dueDate}</span><span class="badge ${mySub ? "done":"pending"}">${mySub ? "已提交":"待完成"}</span></div>
      <div class="actions">
        <button class="btn primary" onclick="selectTask(${t.id})">进入任务</button>
        <a class="btn ghost" href="${taskLink(t.id)}" target="_blank">任务入口链接</a>
      </div>
    </div>`;
  }).join("");
  document.getElementById("studentTasks").innerHTML = tasksHtml;
  const options = state.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join("");
  document.getElementById("taskSelector").innerHTML = options;
  document.getElementById("commentTaskSelector").innerHTML = options;
  const selected = Number(document.getElementById("taskSelector").value || state.tasks[0]?.id);
  selectTask(selected);
}
function selectTask(taskId){
  const task = getTaskById(taskId);
  if(!task) return;
  document.getElementById("taskSelector").value = taskId;
  document.getElementById("commentTaskSelector").value = taskId;
  document.getElementById("studentTaskInfo").innerHTML = `
    <h3>${escapeHtml(task.title)}</h3>
    <p>${escapeHtml(task.objective)}</p>
    <div class="task-meta"><span>截止：${task.dueDate}</span><span>学生扫码入口：${taskLink(task.id)}</span></div>
    <div class="callout">数据说明：${escapeHtml(task.datasetHint)}</div>`;
  renderComments(taskId);
  const sub = getSubmission(taskId, currentUser.id);
  renderSubmissionView(sub);
}
function renderSubmissionView(sub){
  if(!sub){
    document.getElementById("dataSummary").innerHTML = "";
    document.getElementById("dataPreview").innerHTML = "";
    document.getElementById("aiAnswer").textContent = "上传数据后显示AI提示。";
    document.getElementById("reportText").textContent = "上传数据后自动生成实验报告。";
    document.getElementById("aiAnswer").classList.add("empty");
    document.getElementById("reportText").classList.add("empty");
    return;
  }
  const summary = sub.summary;
  const preview = sub.preview;
  const stats = sub.stats;
  document.getElementById("dataSummary").innerHTML = `<div class="callout"><strong>数据概况</strong><div>样本量：${summary.rows}；字段数：${summary.columns}</div><div>字段：${summary.fields.join("、")}</div></div>`;
  let tableHtml = "";
  if(preview.length){
    tableHtml += `<div class="table-wrap"><table><tr>${Object.keys(preview[0]).map(k=>`<th>${escapeHtml(k)}</th>`).join("")}</tr>`;
    tableHtml += preview.map(row => `<tr>${Object.values(row).map(v=>`<td>${escapeHtml(v)}</td>`).join("")}</tr>`).join("");
    tableHtml += `</table></div>`;
  }
  if(Object.keys(stats).length){
    tableHtml += `<div class="callout"><strong>关键统计</strong><br>` + Object.entries(stats).map(([k,v])=>`${k}：均值 ${v["均值"]}，最大值 ${v["最大值"]}，最小值 ${v["最小值"]}`).join("<br>") + `</div>`;
  }
  document.getElementById("dataPreview").innerHTML = tableHtml;
  document.getElementById("aiAnswer").textContent = sub.aiText || "";
  document.getElementById("reportText").textContent = sub.reportText || "";
  document.getElementById("aiAnswer").classList.remove("empty");
  document.getElementById("reportText").classList.remove("empty");
  if(sub.score){
    document.getElementById("reportText").textContent += `\n\n【教师评分】${sub.score} 分\n【教师反馈】${sub.feedback || "暂无文字反馈"}`;
  }
}
function renderComments(taskId){
  const comments = getComments(taskId);
  document.getElementById("commentList").innerHTML = comments.length ? comments.map(c=>{
    const user = getUser(c.userId);
    return `<div class="comment-card"><div><strong>${user.displayName}</strong> <span class="muted">${c.createdAt}</span></div><div>${escapeHtml(c.content)}</div></div>`;
  }).join("") : `<div class="muted">暂无讨论记录。</div>`;
}
function renderAdmin(){
  const roleCounts = {};
  state.users.forEach(u => roleCounts[u.role] = (roleCounts[u.role] || 0) + 1);
  const stats = [
    {label:"教师账号", value: roleCounts.teacher || 0},
    {label:"学生账号", value: roleCounts.student || 0},
    {label:"管理员账号", value: roleCounts.admin || 0},
    {label:"任务总数", value: state.tasks.length},
    {label:"讨论数", value: state.comments.length},
    {label:"提交总数", value: state.submissions.length}
  ];
  document.getElementById("adminStats").innerHTML = stats.map(s => `<div class="panel kpi"><div class="kpi-num">${s.value}</div><div>${s.label}</div></div>`).join("");
}
function autoOpenTaskFromQuery(){
  const params = new URLSearchParams(location.search);
  const task = params.get("task");
  if(task){
    selectTask(Number(task));
  }
}

document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const form = new FormData(e.target);
  login(form.get("username"), form.get("password"));
});
document.getElementById("taskForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const nextId = Math.max(0, ...state.tasks.map(t=>t.id)) + 1;
  state.tasks.push({
    id: nextId,
    title: form.get("title"),
    objective: form.get("objective"),
    datasetHint: form.get("datasetHint"),
    dueDate: form.get("dueDate")
  });
  saveState();
  e.target.reset();
  renderTeacher();
  toast("任务已创建。");
});
document.getElementById("uploadForm").addEventListener("submit", e => {
  e.preventDefault();
  const file = document.getElementById("csvFile").files[0];
  const taskId = Number(document.getElementById("taskSelector").value);
  if(!file){ toast("请先选择CSV文件。"); return; }
  const task = getTaskById(taskId);
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseCSV(reader.result);
    const aiQuestion = document.getElementById("aiQuestion").value.trim();
    const aiText = generateAI(task, parsed.summary, parsed.stats, aiQuestion);
    const reportText = generateReport(task, parsed.summary, parsed.stats, aiText, currentUser);
    const existing = state.submissions.find(s => s.taskId === taskId && s.studentId === currentUser.id);
    const payload = {
      id: existing ? existing.id : (Math.max(0,...state.submissions.map(s=>s.id || 0)) + 1),
      taskId, studentId: currentUser.id, filename: file.name, submittedAt: new Date().toLocaleString(),
      preview: parsed.preview, summary: parsed.summary, stats: parsed.stats,
      aiText, reportText, score: existing?.score || null, feedback: existing?.feedback || ""
    };
    if(existing){
      Object.assign(existing, payload);
    } else {
      state.submissions.push(payload);
    }
    saveState();
    renderSubmissionView(payload);
    renderTeacher();
    toast("数据已分析并生成报告。");
  };
  reader.readAsText(file, "utf-8");
});
document.getElementById("commentForm").addEventListener("submit", e => {
  e.preventDefault();
  const taskId = Number(document.getElementById("commentTaskSelector").value);
  const content = document.getElementById("commentInput").value.trim();
  if(!content){ toast("请输入讨论内容。"); return; }
  state.comments.unshift({
    id: Math.max(0, ...state.comments.map(c=>c.id || 0)) + 1,
    taskId, userId: currentUser.id, content, createdAt: new Date().toLocaleString()
  });
  saveState();
  document.getElementById("commentInput").value = "";
  renderComments(taskId);
  renderTeacher();
  toast("讨论内容已提交。");
});

window.addEventListener("load", renderAll);
