
const USERS = {
  teacher01: { password: 'Teacher@123', role: 'teacher', name: '课程教师（演示）' },
  student01: { password: 'Student@123', role: 'student', name: '实训学生（演示）' },
  admin01: { password: 'Admin@123', role: 'admin', name: '平台管理员（演示）' }
};

const DATASETS = {
  sales: {
    key: 'sales',
    name: '商业销售分析数据',
    file: 'data/sales_analysis.csv',
    scenario: '企业经营分析 / 销售绩效诊断',
    tags: ['销售趋势', '区域对比', '利润分析'],
    desc: '覆盖 2025 年 12 个月、4 个区域、3 类产品的销售表现数据，可用于销售趋势、利润结构与区域经营分析。'
  },
  customer: {
    key: 'customer',
    name: '客户行为与营销响应数据',
    file: 'data/customer_behavior.csv',
    scenario: '用户画像 / 精准营销 / 客户分层',
    tags: ['客户画像', '复购分析', '营销响应'],
    desc: '包含客户访问、下单、客单价、复购率和营销触达等字段，可用于客户分层与营销效果分析。'
  },
  inventory: {
    key: 'inventory',
    name: '库存与供应链决策数据',
    file: 'data/inventory_decision.csv',
    scenario: '库存优化 / 缺货预警 / 供应商评价',
    tags: ['补货决策', '安全库存', '供应商评分'],
    desc: '基于 SKU、库存、安全库存、销量、补货提前期和供应商评分构建，适用于库存决策训练。'
  }
};

const NAVS = {
  teacher: [
    { key: 'overview', label: '教学概览' },
    { key: 'tasks', label: '任务管理' },
    { key: 'feedback', label: '提交与反馈' },
    { key: 'qr', label: '二维码入口' }
  ],
  student: [
    { key: 'overview', label: '我的实训' },
    { key: 'datasets', label: '数据集中心' },
    { key: 'analysis', label: '实验分析' },
    { key: 'report', label: '实验报告' }
  ],
  admin: [
    { key: 'overview', label: '平台概况' },
    { key: 'accounts', label: '账号与角色' },
    { key: 'logs', label: '运行记录' }
  ]
};

const STORAGE_KEYS = {
  tasks: 'gaip.tasks.v2',
  submissions: 'gaip.submissions.v2',
  comments: 'gaip.comments.v2',
  logs: 'gaip.logs.v2',
  reportDraft: 'gaip.reportDraft.v2'
};

let currentUser = null;
let currentTab = 'overview';
let activeDatasetKey = 'sales';
let chartInstance = null;
let currentAnalysis = null;

function getBaseUrl() {
  const path = location.pathname.endsWith('/') ? location.pathname : location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
  return `${location.protocol}//${location.host}${path}`;
}

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedDemoData(force = false) {
  if (!force && localStorage.getItem(STORAGE_KEYS.tasks)) return;
  const tasks = [
    {
      id: 'T001',
      title: '销售绩效诊断与经营建议',
      objective: '利用真实销售数据识别销售趋势、区域差异和利润波动，形成经营优化建议。',
      datasetKey: 'sales',
      dueDate: '2026-04-18',
      status: '进行中'
    },
    {
      id: 'T002',
      title: '客户分层与营销响应分析',
      objective: '结合客户行为与营销触达数据构建用户画像，识别高价值客群并提出精准营销建议。',
      datasetKey: 'customer',
      dueDate: '2026-04-22',
      status: '进行中'
    },
    {
      id: 'T003',
      title: '库存预警与补货决策实训',
      objective: '基于库存与供应链数据识别缺货风险，形成安全库存与补货策略。',
      datasetKey: 'inventory',
      dueDate: '2026-04-25',
      status: '待开始'
    }
  ];
  const submissions = [
    {
      id: 'S001',
      taskId: 'T001',
      user: 'student01',
      score: 91,
      teacherComment: '指标解释较完整，建议进一步突出利润率变化原因。',
      submittedAt: '2026-04-08 14:30',
      reportSummary: '识别出华东区域销售额高但利润率波动明显，建议优化渠道结构。'
    }
  ];
  const comments = [
    {
      id: 'C001',
      taskId: 'T001',
      user: 'student01',
      content: '建议优先比较不同区域利润率与销售额之间的匹配关系。',
      time: '2026-04-08 14:10'
    }
  ];
  const logs = [
    { time: '2026-04-08 13:58', action: '平台初始化', detail: '加载演示任务、样例提交与讨论记录' },
    { time: '2026-04-08 14:00', action: '教师建课', detail: '创建销售绩效诊断任务 T001' },
    { time: '2026-04-08 14:05', action: '学生实验', detail: 'student01 进入 T001 并开始数据分析' }
  ];
  writeStorage(STORAGE_KEYS.tasks, tasks);
  writeStorage(STORAGE_KEYS.submissions, submissions);
  writeStorage(STORAGE_KEYS.comments, comments);
  writeStorage(STORAGE_KEYS.logs, logs);
  localStorage.removeItem(STORAGE_KEYS.reportDraft);
}

function addLog(action, detail) {
  const logs = readStorage(STORAGE_KEYS.logs, []);
  logs.unshift({ time: new Date().toLocaleString('zh-CN', { hour12: false }), action, detail });
  writeStorage(STORAGE_KEYS.logs, logs.slice(0, 30));
}

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
function esc(str) { return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(x => x.trim().replace(/^\uFEFF/, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (values[idx] ?? '').trim());
    return obj;
  });
  return { headers, rows };
}

async function loadDataset(key) {
  const meta = DATASETS[key];
  const res = await fetch(meta.file);
  const text = await res.text();
  return { meta, ...parseCSV(text) };
}

function getTasks() { return readStorage(STORAGE_KEYS.tasks, []); }
function getSubmissions() { return readStorage(STORAGE_KEYS.submissions, []); }
function getComments() { return readStorage(STORAGE_KEYS.comments, []); }

function computeSummary(parsed) {
  const { headers, rows } = parsed;
  const numericHeaders = headers.filter(h => rows.some(r => !isNaN(parseFloat(r[h]))));
  const summary = {
    rowCount: rows.length,
    colCount: headers.length,
    numericHeaders,
    metrics: {}
  };
  numericHeaders.forEach(h => {
    const nums = rows.map(r => parseFloat(r[h])).filter(n => !isNaN(n));
    const sum = nums.reduce((a,b) => a+b, 0);
    summary.metrics[h] = {
      count: nums.length,
      avg: nums.length ? sum / nums.length : 0,
      min: nums.length ? Math.min(...nums) : 0,
      max: nums.length ? Math.max(...nums) : 0,
      sum
    };
  });
  return summary;
}

function makeInsight(datasetKey, parsed, summary) {
  const task = Object.values(DATASETS).find(d => d.key === datasetKey);
  const lines = [];
  lines.push(`【AI 助教分析提示】`);
  lines.push(`数据集：${task.name}`);
  lines.push(`样本量：${summary.rowCount} 行，字段数：${summary.colCount} 个。`);
  if (datasetKey === 'sales') {
    const sales = summary.metrics['销售额']?.sum || 0;
    const cost = summary.metrics['成本']?.sum || 0;
    const margin = sales ? ((sales - cost) / sales * 100).toFixed(2) : '0.00';
    lines.push(`总体销售额约为 ${sales.toFixed(2)} 元，总体利润率约为 ${margin}%。`);
    lines.push(`建议优先比较不同区域、不同产品类别的销售额与利润率匹配情况，并识别高销售低利润环节。`);
    lines.push(`教学提示：可引导学生围绕“销量—销售额—利润率”三类指标构建经营诊断框架。`);
  } else if (datasetKey === 'customer') {
    const orderAvg = summary.metrics['近90天下单次数']?.avg || 0;
    const aov = summary.metrics['客单价']?.avg || 0;
    lines.push(`平均下单次数约为 ${orderAvg.toFixed(2)} 次，平均客单价约为 ${aov.toFixed(2)} 元。`);
    lines.push(`建议识别高访问低转化人群、高复购高客单人群，并比较不同地区或分层客群的营销响应差异。`);
    lines.push(`教学提示：可引导学生形成“客户特征—营销触达—行为响应—策略优化”的分析逻辑。`);
  } else {
    const current = summary.metrics['当前库存']?.avg || 0;
    const safe = summary.metrics['安全库存']?.avg || 0;
    lines.push(`平均当前库存约为 ${current.toFixed(2)}，平均安全库存约为 ${safe.toFixed(2)}。`);
    lines.push(`建议重点识别“当前库存低于安全库存且近60天缺货次数较高”的 SKU，作为补货决策重点对象。`);
    lines.push(`教学提示：可引导学生综合库存量、销量、提前期和供应商评分开展补货优先级判断。`);
  }
  return lines.join('\n');
}

function buildReport(datasetKey, parsed, summary) {
  const meta = DATASETS[datasetKey];
  const lines = [];
  lines.push('实验报告（自动生成示例）');
  lines.push(`一、实验主题\n${meta.name}`);
  lines.push(`二、实验场景\n${meta.scenario}`);
  lines.push(`三、数据概况\n本次实验使用 ${summary.rowCount} 条记录、${summary.colCount} 个字段的数据，主要用于 ${meta.tags.join('、')}。`);
  const firstMetric = summary.numericHeaders[0];
  if (firstMetric) {
    lines.push(`四、关键指标\n字段“${firstMetric}”均值为 ${summary.metrics[firstMetric].avg.toFixed(2)}，最小值为 ${summary.metrics[firstMetric].min.toFixed(2)}，最大值为 ${summary.metrics[firstMetric].max.toFixed(2)}。`);
  }
  lines.push(`五、分析发现\n1. 数据中存在较明显的结构差异，适合开展分组比较分析。\n2. 可围绕关键数值变量进行趋势、对比和诊断。\n3. 适合结合课程知识形成数据驱动的管理决策建议。`);
  lines.push(`六、决策建议\n建议在课堂中引导学生将数据特征解释与业务场景结合，从“问题识别—原因分析—策略提出—执行优化”四步形成完整报告。`);
  lines.push(`七、教学反思\n本实验支持学生在真实数据基础上完成分析、解释与报告撰写，有助于提升数据分析、业务理解与决策表达能力。`);
  return lines.join('\n\n');
}

function renderTopUser() {
  const el = qs('#topUserArea');
  if (!currentUser) {
    el.innerHTML = '<span class="badge">请使用测试账号登录</span>';
  } else {
    el.innerHTML = `<span class="badge">${currentUser.name}｜${roleLabel(currentUser.role)}</span>`;
  }
}

function roleLabel(role) {
  return ({ teacher: '教师端', student: '学生端', admin: '管理员端' })[role] || role;
}

function showLogin() {
  qs('#loginView').classList.remove('hidden');
  qs('#appView').classList.add('hidden');
  currentUser = null;
  renderTopUser();
}

function showApp() {
  qs('#loginView').classList.add('hidden');
  qs('#appView').classList.remove('hidden');
  qs('#sidebarRole').textContent = roleLabel(currentUser.role);
  qs('#sidebarUser').textContent = currentUser.name;
  qs('#sidebarDesc').textContent = '支持课程实验、案例分析、过程评价与教学展示';
  renderTopUser();
  renderNav();
  renderCurrentTab();
}

function renderNav() {
  const nav = qs('#sideNav');
  const items = NAVS[currentUser.role];
  nav.innerHTML = items.map(item => `<button class="nav-btn ${item.key === currentTab ? 'active' : ''}" data-tab="${item.key}">${item.label}</button>`).join('');
  qsa('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
    currentTab = btn.dataset.tab;
    renderNav();
    renderCurrentTab();
  }));
}

function renderCurrentTab() {
  const area = qs('#contentArea');
  const role = currentUser.role;
  const headers = {
    teacher: {
      overview: ['教学概览', '查看课程任务、提交情况与教学运行状态。'],
      tasks: ['任务管理', '创建、查看并维护课程实验任务。'],
      feedback: ['提交与反馈', '查看学生提交、进行评分与教师反馈。'],
      qr: ['二维码入口', '生成线上平台首页二维码与任务访问说明。']
    },
    student: {
      overview: ['我的实训', '查看任务进度、数据集入口与实验步骤提示。'],
      datasets: ['数据集中心', '浏览内置真实教学数据并选择实验场景。'],
      analysis: ['实验分析', '完成数据预览、统计分析、图表展示与 AI 提示。'],
      report: ['实验报告', '查看自动生成报告并提交实验讨论。']
    },
    admin: {
      overview: ['平台概况', '查看角色数量、任务数量、数据集与提交概览。'],
      accounts: ['账号与角色', '查看测试账号、角色权限和平台支撑说明。'],
      logs: ['运行记录', '查看最近操作与平台演示日志。']
    }
  };
  qs('#pageTitle').textContent = headers[role][currentTab][0];
  qs('#pageDesc').textContent = headers[role][currentTab][1];
  if (role === 'teacher') area.innerHTML = teacherTemplates[currentTab]();
  if (role === 'student') area.innerHTML = studentTemplates[currentTab]();
  if (role === 'admin') area.innerHTML = adminTemplates[currentTab]();
  bindDynamicEvents();
}

const teacherTemplates = {
  overview: () => {
    const tasks = getTasks();
    const subs = getSubmissions();
    const feedbackRate = tasks.length ? ((subs.length / tasks.length) * 100).toFixed(0) : 0;
    return `
      <div class="kpi-grid">
        <div class="kpi"><div class="label">课程任务数</div><div class="value">${tasks.length}</div></div>
        <div class="kpi"><div class="label">学生提交数</div><div class="value">${subs.length}</div></div>
        <div class="kpi"><div class="label">内置数据集</div><div class="value">${Object.keys(DATASETS).length}</div></div>
        <div class="kpi"><div class="label">任务覆盖率</div><div class="value">${feedbackRate}%</div></div>
      </div>
      <div class="grid-2">
        <div class="card panel">
          <h3>当前实训任务</h3>
          <div class="timeline">${tasks.map(t => `<div class="timeline-item"><strong>${t.title}</strong><div class="small muted">截止：${t.dueDate} ｜ 数据集：${DATASETS[t.datasetKey].name} ｜ 状态：${t.status}</div><div style="margin-top:8px;">${t.objective}</div></div>`).join('')}</div>
        </div>
        <div class="card panel">
          <h3>教学提示</h3>
          <div class="notice">建议教师展示时按照“任务发布 → 数据选择 → AI 提示 → 实验报告 → 教师反馈”的顺序进行演示，以突出平台的完整教学闭环。</div>
          <div class="chart-box"><canvas id="teacherChart"></canvas></div>
        </div>
      </div>`;
  },
  tasks: () => {
    const tasks = getTasks();
    return `
      <div class="grid-2">
        <div class="card panel">
          <div class="toolbar"><h3>任务列表</h3><span class="badge">教师建课与任务维护</span></div>
          <div class="table-wrap">
            <table><thead><tr><th>任务编号</th><th>任务名称</th><th>数据集</th><th>截止日期</th><th>状态</th></tr></thead><tbody>
              ${tasks.map(t => `<tr><td>${t.id}</td><td>${t.title}</td><td>${DATASETS[t.datasetKey].name}</td><td>${t.dueDate}</td><td>${t.status}</td></tr>`).join('')}
            </tbody></table>
          </div>
        </div>
        <div class="card panel">
          <h3>新建任务</h3>
          <form id="taskForm" class="form-grid">
            <label>任务名称<input name="title" required /></label>
            <label>适用数据集<select name="datasetKey">${Object.values(DATASETS).map(d => `<option value="${d.key}">${d.name}</option>`).join('')}</select></label>
            <label>实验目标<textarea name="objective" rows="4" required></textarea></label>
            <label>截止日期<input type="date" name="dueDate" required /></label>
            <button class="btn primary" type="submit">创建任务</button>
          </form>
        </div>
      </div>`;
  },
  feedback: () => {
    const subs = getSubmissions();
    if (!subs.length) return `<div class="card panel"><h3>学生提交与评分</h3><div class="muted">暂无提交，请先在学生端完成一次数据分析与报告生成。</div></div>`;
    return `
      <div class="card panel">
        <h3>学生提交与评分</h3>
        <div class="table-wrap">
          <table><thead><tr><th>提交编号</th><th>任务</th><th>提交人</th><th>摘要</th><th>得分</th><th>教师反馈</th><th>提交时间</th></tr></thead><tbody>
            ${subs.map(s => `<tr>
              <td>${s.id}</td><td>${s.taskId}</td><td>${s.user}</td><td>${esc(s.reportSummary)}</td>
              <td><input data-score-id="${s.id}" value="${s.score ?? ''}" style="width:80px"/></td>
              <td><textarea data-comment-id="${s.id}" rows="2">${esc(s.teacherComment || '')}</textarea></td>
              <td>${s.submittedAt}</td>
            </tr>`).join('')}
          </tbody></table>
        </div>
        <div style="margin-top:12px;"><button class="btn primary" id="saveFeedbackBtn">保存评分反馈</button></div>
      </div>`;
  },
  qr: () => {
    const firstTask = getTasks()[0];
    const taskLink = `${getBaseUrl()}?task=${firstTask?.id || 'T001'}`;
    return `
      <div class="grid-2">
        <div class="card panel">
          <h3>平台首页二维码</h3>
          <div class="qr-box"><div id="taskQr"></div><div><div><strong>扫码说明</strong></div><div class="muted" style="line-height:1.8; margin-top:8px;">可将该二维码放入申报书附件或答辩展示页，扫码后进入线上平台首页。</div><div style="margin-top:8px;"><a href="${getBaseUrl()}" target="_blank">${getBaseUrl()}</a></div></div></div>
        </div>
        <div class="card panel">
          <h3>任务访问地址</h3>
          <div class="result-box">首页链接：${getBaseUrl()}\n任务示例链接：${taskLink}\n\n建议在正式材料中同时提供平台首页二维码与教师端测试账号，以形成“二维码—登录—任务—分析—报告”的完整展示闭环。</div>
        </div>
      </div>`;
  }
};

const studentTemplates = {
  overview: () => {
    const tasks = getTasks();
    return `
      <div class="kpi-grid">
        <div class="kpi"><div class="label">待完成任务</div><div class="value">${tasks.length}</div></div>
        <div class="kpi"><div class="label">内置数据集</div><div class="value">${Object.keys(DATASETS).length}</div></div>
        <div class="kpi"><div class="label">最近报告状态</div><div class="value">${localStorage.getItem(STORAGE_KEYS.reportDraft) ? '已生成' : '未生成'}</div></div>
        <div class="kpi"><div class="label">协作讨论记录</div><div class="value">${getComments().length}</div></div>
      </div>
      <div class="split">
        <div class="card panel">
          <h3>实训任务清单</h3>
          <div class="timeline">${tasks.map(t => `<div class="timeline-item"><strong>${t.title}</strong><div class="small muted">任务编号：${t.id}｜截止：${t.dueDate}</div><div style="margin-top:6px;">${t.objective}</div></div>`).join('')}</div>
        </div>
        <div class="card panel">
          <h3>实验步骤</h3>
          <div class="result-box">步骤 1：进入“数据集中心”选择内置真实教学数据。\n步骤 2：在“实验分析”中预览数据、生成统计结果与图表。\n步骤 3：查看 AI 助教提示。\n步骤 4：在“实验报告”中保存自动生成报告并提交讨论记录。</div>
        </div>
      </div>`;
  },
  datasets: () => {
    return `<div class="grid-3">${Object.values(DATASETS).map(d => `
      <div class="card dataset-card">
        <div class="dataset-title">${d.name}</div>
        <div class="dataset-meta">应用场景：${d.scenario}</div>
        <div>${d.desc}</div>
        <div class="tag-row">${d.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        <div class="actions-inline"><button class="btn subtle dataset-open" data-dataset="${d.key}">设为当前数据集</button><a class="btn ghost" href="${d.file}" download>下载 CSV</a></div>
      </div>`).join('')}</div>`;
  },
  analysis: () => {
    return `
      <div class="grid-2">
        <div class="card panel">
          <div class="toolbar"><h3>数据选择与预览</h3><span class="badge">当前数据集：${DATASETS[activeDatasetKey].name}</span></div>
          <form id="analysisForm" class="form-grid">
            <label>选择内置数据集<select id="datasetSelect">${Object.values(DATASETS).map(d => `<option value="${d.key}" ${d.key === activeDatasetKey ? 'selected' : ''}>${d.name}</option>`).join('')}</select></label>
            <label>或上传本地 CSV 数据<input type="file" id="csvFile" accept=".csv"/></label>
            <label>向 AI 助教提问<textarea id="aiQuestion" rows="3">请结合数据特点，给出关键指标解释、问题识别和管理决策建议。</textarea></label>
            <button class="btn primary" type="submit">开始分析</button>
          </form>
          <div id="summaryArea" class="result-box" style="margin-top:14px;">请选择数据集后点击“开始分析”。</div>
        </div>
        <div class="card panel">
          <h3>图表展示</h3>
          <div class="chart-box"><canvas id="analysisChart"></canvas></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card panel"><h3>AI 助教提示</h3><div id="aiArea" class="result-box">分析完成后显示 AI 提示。</div></div>
        <div class="card panel"><h3>数据预览（前 10 行）</h3><div id="previewArea" class="table-wrap muted">分析完成后显示预览表格。</div></div>
      </div>`;
  },
  report: () => {
    const draft = localStorage.getItem(STORAGE_KEYS.reportDraft);
    return `
      <div class="grid-2">
        <div class="card panel">
          <h3>实验报告</h3>
          <div id="reportArea" class="result-box">${draft ? esc(draft) : '请先在“实验分析”中生成数据分析结果后，再自动生成实验报告。'}</div>
          <div class="actions-inline" style="margin-top:12px;">
            <button class="btn primary" id="submitReportBtn">提交报告到教师端</button>
          </div>
        </div>
        <div class="card panel">
          <h3>小组协作讨论</h3>
          <form id="commentForm" class="form-grid">
            <label>选择任务<select id="commentTask">${getTasks().map(t => `<option value="${t.id}">${t.id} - ${t.title}</option>`).join('')}</select></label>
            <label>讨论内容<textarea id="commentInput" rows="4" placeholder="请输入实验发现、分工安排或改进建议"></textarea></label>
            <button class="btn primary" type="submit">提交讨论</button>
          </form>
          <div class="timeline" style="margin-top:14px;">${getComments().map(c => `<div class="timeline-item"><strong>${c.user}</strong><div class="small muted">${c.time} ｜ ${c.taskId}</div><div style="margin-top:6px;">${esc(c.content)}</div></div>`).join('')}</div>
        </div>
      </div>`;
  }
};

const adminTemplates = {
  overview: () => {
    const tasks = getTasks();
    const subs = getSubmissions();
    const logs = readStorage(STORAGE_KEYS.logs, []);
    return `
      <div class="kpi-grid">
        <div class="kpi"><div class="label">测试账号数</div><div class="value">3</div></div>
        <div class="kpi"><div class="label">任务总数</div><div class="value">${tasks.length}</div></div>
        <div class="kpi"><div class="label">提交总数</div><div class="value">${subs.length}</div></div>
        <div class="kpi"><div class="label">运行日志</div><div class="value">${logs.length}</div></div>
      </div>
      <div class="grid-2">
        <div class="card panel"><h3>平台支撑说明</h3><div class="result-box">本平台面向商科实训教学展示，采用静态前端部署方式，支持 GitHub Pages 公网演示。平台内置真实教学数据集、角色账号、任务流与报告生成逻辑，可满足竞赛展示、教学汇报和软件作品申报需要。</div></div>
        <div class="card panel"><h3>数据集概况</h3><div class="timeline">${Object.values(DATASETS).map(d => `<div class="timeline-item"><strong>${d.name}</strong><div class="small muted">${d.scenario}</div><div style="margin-top:6px;">${d.desc}</div></div>`).join('')}</div></div>
      </div>`;
  },
  accounts: () => `
    <div class="grid-2">
      <div class="card panel">
        <h3>测试账号与角色</h3>
        <div class="table-wrap"><table><thead><tr><th>用户名</th><th>角色</th><th>说明</th></tr></thead><tbody>
          <tr><td>teacher01</td><td>教师端</td><td>用于任务发布、查看提交与评分反馈。</td></tr>
          <tr><td>student01</td><td>学生端</td><td>用于数据分析、AI 提示、实验报告与协作讨论。</td></tr>
          <tr><td>admin01</td><td>管理员端</td><td>用于展示平台概况、账号信息与日志记录。</td></tr>
        </tbody></table></div>
      </div>
      <div class="card panel">
        <h3>运行环境说明</h3>
        <div class="result-box">1. 平台支持 Chrome、Edge、Safari 等现代浏览器。\n2. 可部署于 GitHub Pages、Netlify、Vercel 等静态托管平台。\n3. 当前版本用于教学演示与竞赛申报，提交记录与讨论内容保存在浏览器本地环境。\n4. 内置数据集可直接下载、预览、分析与截图展示。</div>
      </div>
    </div>`,
  logs: () => {
    const logs = readStorage(STORAGE_KEYS.logs, []);
    return `<div class="card panel"><h3>最近运行记录</h3><div class="timeline">${logs.map(l => `<div class="timeline-item"><strong>${l.action}</strong><div class="small muted">${l.time}</div><div style="margin-top:6px;">${esc(l.detail)}</div></div>`).join('')}</div></div>`;
  }
};

function bindDynamicEvents() {
  qs('#logoutBtn')?.addEventListener('click', showLogin);
  qs('#resetDemoBtn')?.addEventListener('click', () => {
    seedDemoData(true);
    addLog('恢复演示数据', '平台已重置为默认教学演示状态');
    renderCurrentTab();
  });

  qs('#taskForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const tasks = getTasks();
    const id = 'T' + String(tasks.length + 1).padStart(3, '0');
    tasks.push({
      id,
      title: fd.get('title'),
      objective: fd.get('objective'),
      datasetKey: fd.get('datasetKey'),
      dueDate: fd.get('dueDate'),
      status: '进行中'
    });
    writeStorage(STORAGE_KEYS.tasks, tasks);
    addLog('教师建课', `创建任务 ${id}：${fd.get('title')}`);
    alert('任务已创建。');
    currentTab = 'tasks';
    renderNav();
    renderCurrentTab();
  });

  qs('#saveFeedbackBtn')?.addEventListener('click', () => {
    const subs = getSubmissions();
    subs.forEach(item => {
      const score = document.querySelector(`[data-score-id="${item.id}"]`)?.value;
      const comment = document.querySelector(`[data-comment-id="${item.id}"]`)?.value;
      item.score = score ? Number(score) : item.score;
      item.teacherComment = comment || item.teacherComment;
    });
    writeStorage(STORAGE_KEYS.submissions, subs);
    addLog('教师反馈', '更新学生提交评分与反馈意见');
    alert('评分反馈已保存。');
  });

  qsa('.dataset-open').forEach(btn => btn.addEventListener('click', () => {
    activeDatasetKey = btn.dataset.dataset;
    currentTab = 'analysis';
    renderNav();
    renderCurrentTab();
  }));

  qs('#analysisForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const selected = qs('#datasetSelect').value;
    activeDatasetKey = selected;
    let parsed;
    const file = qs('#csvFile').files[0];
    if (file) {
      const text = await file.text();
      parsed = parseCSV(text);
    } else {
      parsed = await loadDataset(selected);
    }
    const summary = computeSummary(parsed);
    const insight = makeInsight(selected, parsed, summary);
    const report = buildReport(selected, parsed, summary);
    currentAnalysis = { parsed, summary, insight, report, datasetKey: selected };
    localStorage.setItem(STORAGE_KEYS.reportDraft, report);
    renderAnalysisResults(currentAnalysis);
    addLog('学生实验', `${currentUser ? currentUser.name : '用户'} 完成 ${DATASETS[selected].name} 数据分析`);
  });

  qs('#submitReportBtn')?.addEventListener('click', () => {
    const draft = localStorage.getItem(STORAGE_KEYS.reportDraft);
    if (!draft) return alert('请先在“实验分析”中生成报告。');
    const subs = getSubmissions();
    const nextId = 'S' + String(subs.length + 1).padStart(3, '0');
    const targetTask = getTasks()[0];
    subs.unshift({
      id: nextId,
      taskId: targetTask?.id || 'T001',
      user: 'student01',
      score: '',
      teacherComment: '待教师评阅',
      submittedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      reportSummary: draft.slice(0, 56) + '...'
    });
    writeStorage(STORAGE_KEYS.submissions, subs);
    addLog('报告提交', `学生提交实验报告 ${nextId}`);
    alert('报告已提交到教师端。');
  });

  qs('#commentForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const taskId = qs('#commentTask').value;
    const content = qs('#commentInput').value.trim();
    if (!content) return alert('请输入讨论内容。');
    const comments = getComments();
    comments.unshift({
      id: 'C' + String(comments.length + 1).padStart(3, '0'),
      taskId,
      user: 'student01',
      content,
      time: new Date().toLocaleString('zh-CN', { hour12: false })
    });
    writeStorage(STORAGE_KEYS.comments, comments);
    addLog('协作讨论', `新增任务 ${taskId} 的讨论记录`);
    alert('讨论已提交。');
    renderCurrentTab();
  });

  if (currentUser?.role === 'teacher' && currentTab === 'overview') renderTeacherChart();
  if (currentUser?.role === 'teacher' && currentTab === 'qr') renderQr();
  qs('#footerBaseUrl').textContent = `有效网址链接：${getBaseUrl()}`;
}

function renderTeacherChart() {
  const ctx = qs('#teacherChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const tasks = getTasks();
  const counts = tasks.map(t => getSubmissions().filter(s => s.taskId === t.id).length);
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tasks.map(t => t.id),
      datasets: [{ label: '提交数', data: counts, backgroundColor: '#2563eb' }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderQr() {
  const el = qs('#taskQr');
  if (!el) return;
  el.innerHTML = '';
  if (window.QRCode) {
    QRCode.toCanvas(getBaseUrl(), { width: 180 }, (err, canvas) => {
      if (err) {
        el.innerHTML = `<div class="muted">二维码生成失败，请直接使用链接：${getBaseUrl()}</div>`;
      } else {
        el.appendChild(canvas);
      }
    });
  } else {
    el.innerHTML = `<div class="muted">当前网络环境未加载二维码库，请直接使用链接：${getBaseUrl()}</div>`;
  }
}

function renderAnalysisResults(result) {
  qs('#summaryArea').textContent = `数据集：${DATASETS[result.datasetKey].name}\n样本量：${result.summary.rowCount} 行\n字段数：${result.summary.colCount} 个\n数值字段：${result.summary.numericHeaders.join('、') || '无'}`;
  qs('#aiArea').textContent = result.insight;
  qs('#previewArea').innerHTML = makePreviewTable(result.parsed);
  renderAnalysisChart(result);
}

function makePreviewTable(parsed) {
  const rows = parsed.rows.slice(0, 10);
  return `<table><thead><tr>${parsed.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${parsed.headers.map(h => `<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderAnalysisChart(result) {
  const ctx = qs('#analysisChart');
  if (!ctx || typeof Chart === 'undefined') return;
  const parsed = result.parsed;
  const headers = parsed.headers;
  let labelKey = headers.find(h => !parsed.rows.every(r => !isNaN(parseFloat(r[h])))) || headers[0];
  let valueKey = result.summary.numericHeaders[0];
  if (result.datasetKey === 'sales') { labelKey = '月份'; valueKey = '销售额'; }
  if (result.datasetKey === 'customer') { labelKey = '客户分层'; valueKey = '近90天下单次数'; }
  if (result.datasetKey === 'inventory') { labelKey = '品类'; valueKey = '当前库存'; }
  const grouped = {};
  parsed.rows.forEach(r => {
    const label = r[labelKey];
    const val = parseFloat(r[valueKey]);
    if (isNaN(val)) return;
    grouped[label] = (grouped[label] || 0) + val;
  });
  const labels = Object.keys(grouped).slice(0, 12);
  const values = labels.map(l => grouped[l]);
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: result.datasetKey === 'sales' ? 'line' : 'bar',
    data: { labels, datasets: [{ label: valueKey, data: values, borderColor:'#1e40af', backgroundColor:'rgba(37,99,235,0.35)', fill: result.datasetKey === 'sales' }] },
    options: { responsive:true, maintainAspectRatio:false }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData(false);
  renderTopUser();
  qs('#footerBaseUrl').textContent = `有效网址链接：${getBaseUrl()}`;
  qs('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = fd.get('username').trim();
    const password = fd.get('password').trim();
    const user = USERS[username];
    if (!user || user.password !== password) {
      alert('用户名或密码错误，请使用页面提供的测试账号登录。');
      return;
    }
    currentUser = { username, ...user };
    currentTab = 'overview';
    addLog('角色登录', `${username} 登录平台`);
    showApp();
  });
});
