// 主应用组件 - AI 任务看板
window.TaskBoard = function TaskBoard() {
  const { useState, useEffect } = React;

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [tasksLoading, setTasksLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [aiPanel, setAiPanel] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [draftText, setDraftText] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [countsData, setCountsData] = useState({ todo: 0, in_progress: 0, done: 0, total: 0 });
  const [statusDropdownId, setStatusDropdownId] = useState(null);
  const [subtaskLoading, setSubtaskLoading] = useState(null);
  const [showTenantSetting, setShowTenantSetting] = useState(false);
  const [customTenantInput, setCustomTenantInput] = useState('');
  const [tenantCopied, setTenantCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 点击外部关闭下拉
  useEffect(function () {
    if (!statusDropdownId) return;
    function handleClick(e) {
      var el = e.target;
      while (el) {
        if (el.classList && el.classList.contains('status-dropdown')) return;
        if (el.classList && el.classList.contains('status-clickable')) return;
        el = el.parentElement;
      }
      setStatusDropdownId(null);
    }
    // 延迟绑定，避免打开下拉的 click 立刻关闭
    var timer = setTimeout(function () {
      document.addEventListener('click', handleClick);
    }, 0);
    return function () {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [statusDropdownId]);

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  // 刷新侧边栏计数（加载全部任务，不受日期筛选影响）
  async function refreshCounts() {
    try {
      var allTasks = await getTasks({});
      setCountsData({
        todo: allTasks.filter(function (t) { return t.status === 'todo'; }).length,
        in_progress: allTasks.filter(function (t) { return t.status === 'in_progress'; }).length,
        done: allTasks.filter(function (t) { return t.status === 'done'; }).length,
        total: allTasks.length,
      });
    } catch (e) {
      console.error(e);
    }
  }

  // 加载任务
  async function loadTasks() {
    setTasksLoading(true);
    try {
      var params = {};
      if (filter !== 'all') params.status = filter;
      if (targetDate) params.targetDate = targetDate;
      setTasks(await getTasks(params));
    } catch (e) {
      console.error(e);
    } finally {
      setTasksLoading(false);
    }
  }

  useEffect(function () {
    loadTasks();
    refreshCounts();
  }, [filter, targetDate]);

  // 创建任务
  async function handleCreate() {
    if (!newTitle.trim()) return;
    setActionLoading(true);
    try {
      await createTask({ title: newTitle, priority: newPriority, targetDate: targetDate || todayStr(), dueDate: newDueDate || undefined });
      setNewTitle('');
      setNewDueDate('');
      setShowCreate(false);
      await loadTasks();
      await refreshCounts();
    } catch (e) {
      showToast('创建失败', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  // 直接切换状态（下拉菜单选择 → 自动跳到对应视图）
  async function handleStatusChange(task, newStatus) {
    try {
      await updateTask(task.id, { status: newStatus });
      setStatusDropdownId(null);
      // 切换到对应的筛选视图
      setFilter(newStatus);
      // refreshCounts 和 loadTasks 由 filter 变化触发
    } catch (e) {
      showToast('操作失败', 'danger');
    }
  }

  // 删除
  async function handleDelete(id) {
    if (!confirm('确定删除此任务？')) return;
    try {
      await deleteTask(id);
      await loadTasks();
      await refreshCounts();
    } catch (e) { showToast('删除失败', 'danger'); }
  }

  // 勾选
  function toggleSelect(id) {
    setSelectedIds(function (prev) {
      if (prev.indexOf(id) >= 0) return prev.filter(function (x) { return x !== id; });
      return prev.concat([id]);
    });
  }

  // AI 功能
  async function runAI(fn) {
    setAiLoading(true);
    setAiResult('');
    try {
      var res = await fn();
      setAiResult(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    } catch (e) {
      setAiResult('错误: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleBreakdown(id) {
    setAiLoading(true);
    try {
      await breakdownTask(id);
      await loadTasks();
      showToast('子任务已生成！', 'success');
    } catch (e) {
      showToast('拆解失败', 'danger');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSummarize() {
    if (selectedIds.length === 0) { showToast('请先选择任务', 'warning'); return; }
    setAiLoading(true);
    setAiResult('');
    try {
      setAiResult(await summarizeTasks(selectedIds));
    } catch (e) {
      setAiResult('错误: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleDraft() {
    if (!draftText.trim()) return;
    setAiLoading(true);
    try {
      await draftTasks(draftText, targetDate || todayStr());
      setDraftText('');
      await loadTasks();
      await refreshCounts();
      showToast('任务已创建！', 'success');
    } catch (e) {
      showToast('创建失败', 'danger');
    } finally {
      setAiLoading(false);
    }
  }

  var priorityLabel = { low: '低', medium: '中', high: '高' };
  var statusLabel = { all: '全部任务', todo: '待办', in_progress: '进行中', done: '已完成' };
  var statusOptions = [
    { value: 'todo', label: '🔴 待办' },
    { value: 'in_progress', label: '🟡 进行中' },
    { value: 'done', label: '🟢 已完成' },
  ];

  return (
    <div className="task-shell">
      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && <div className="sidebar-mobile-overlay" onClick={function () { setSidebarOpen(false); }}></div>}

      {/* 侧边栏 */}
      <div className={'task-sidebar' + (sidebarOpen ? ' sidebar-open' : '')}>
        <div className="task-sidebar-header">
          <button className="new-task-btn" onClick={function () { setShowCreate(true); }}>
            + 新建任务
          </button>
        </div>
        <div className="filter-list">
          <div className={'filter-item' + (filter === 'all' ? ' active' : '')} onClick={function () { setFilter('all'); }}>
            全部 <span className="filter-count">{countsData.total}</span>
          </div>
          <div className={'filter-item' + (filter === 'todo' ? ' active' : '')} onClick={function () { setFilter('todo'); }}>
            🔴 待办 <span className="filter-count">{countsData.todo}</span>
          </div>
          <div className={'filter-item' + (filter === 'in_progress' ? ' active' : '')} onClick={function () { setFilter('in_progress'); }}>
            🟡 进行中 <span className="filter-count">{countsData.in_progress}</span>
          </div>
          <div className={'filter-item' + (filter === 'done' ? ' active' : '')} onClick={function () { setFilter('done'); }}>
            🟢 已完成 <span className="filter-count">{countsData.done}</span>
          </div>
        </div>
        {/* 租户设置 */}
        <div className="tenant-section">
          <div className="ai-menu-title">🔑 租户 ID</div>
          <div className="tenant-id-row">
            <code className="tenant-id-code">{getTenantId().slice(0, 16)}...</code>
            <button
              className="tenant-copy-btn"
              onClick={function () {
                var textarea = document.createElement('textarea');
                textarea.value = getTenantId();
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                setTenantCopied(true);
                setTimeout(function () { setTenantCopied(false); }, 1500);
              }}
            >
              {tenantCopied ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
          {showTenantSetting ? (
            <div className="tenant-edit-row">
              <input
                className="tenant-input"
                placeholder="输入新的租户 ID..."
                value={customTenantInput}
                onChange={function (e) { setCustomTenantInput(e.target.value); }}
                onKeyDown={function (e) {
                  if (e.key === 'Enter') {
                    var val = customTenantInput.trim();
                    if (val) {
                      setTenantId(val);
                      setCustomTenantInput('');
                      setShowTenantSetting(false);
                      loadTasks();
                      refreshCounts();
                      showToast('租户已切换', 'success');
                    }
                  }
                }}
              />
              <button
                className="tenant-apply-btn"
                onClick={function () {
                  var val = customTenantInput.trim();
                  if (!val) return;
                  setTenantId(val);
                  setCustomTenantInput('');
                  setShowTenantSetting(false);
                  loadTasks();
                  refreshCounts();
                  showToast('租户已切换', 'success');
                }}
              >
                切换
              </button>
              <button className="tenant-cancel-btn" onClick={function () { setShowTenantSetting(false); setCustomTenantInput(''); }}>✕</button>
            </div>
          ) : (
            <button className="tenant-change-btn" onClick={function () { setShowTenantSetting(true); }}>
              更换租户
            </button>
          )}
        </div>

        <div className="task-sidebar-footer">
          <div className="ai-menu-title">🤖 AI 工具</div>
          <button className="ai-menu-btn" onClick={function () { runAI(getDailyBrief); }} disabled={aiLoading}>🌅 每日简报</button>
          <button className="ai-menu-btn" onClick={function () { runAI(getNudge); }} disabled={aiLoading}>⏰ 拖延提醒</button>
          <button className="ai-menu-btn" onClick={function () { runAI(getRecommend); }} disabled={aiLoading}>🔮 智能推荐</button>
          <button className="ai-menu-btn" onClick={handleSummarize} disabled={aiLoading || selectedIds.length === 0}>📊 总结 ({selectedIds.length})</button>
          <button className="ai-menu-btn" onClick={function () { setAiPanel('search'); }}>🔍 搜索</button>
          <button className="ai-menu-btn" onClick={function () { setAiPanel('draft'); }}>🧹 脑暴转任务</button>
        </div>
      </div>

      {/* 主区域 */}
      <div className="task-main">
        <div className="task-header">
          {/* 移动端汉堡菜单 + 标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="hamburger-btn" onClick={function () { setSidebarOpen(!sidebarOpen); }} aria-label="菜单">
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
            <h1>🤖 AI 任务看板</h1>
          </div>
          <div className="quick-actions-row">
            <button className="quick-action-btn quick-create" onClick={function () { setShowCreate(true); }}>+ 新建任务</button>
            <button className="quick-action-btn quick-draft" onClick={function () { setAiPanel('draft'); }}>🧹 脑暴转任务</button>
            <button className="quick-action-btn quick-recommend" onClick={function () { runAI(getRecommend); }} disabled={aiLoading}>🔮 智能推荐</button>
          </div>
          <div className="task-header-row">
            <p>{statusLabel[filter] || '全部任务'}{' · '}{tasks.length} 项任务</p>
            <div className="date-picker-wrapper">
              <label className="date-picker-label">📅</label>
              <input
                type="date"
                className="date-picker"
                value={targetDate}
                onChange={function (e) { setTargetDate(e.target.value); }}
              />
              {targetDate && (
                <button className="date-clear-btn" onClick={function () { setTargetDate(''); }}>清除</button>
              )}
            </div>
          </div>
        </div>

        <div className="task-body">
          {/* 搜索面板 */}
          {aiPanel === 'search' && (
            <div className="ai-panel">
              <input
                className="ai-panel-input"
                placeholder="用自然语言搜索任务..."
                onKeyDown={function (e) {
                  if (e.key === 'Enter') runAI(function () { return searchTasks(e.target.value); });
                }}
              />
              <button className="ai-panel-close" onClick={function () { setAiPanel(null); setAiResult(''); }}>✕</button>
            </div>
          )}
          {/* 脑暴面板 */}
          {aiPanel === 'draft' && (
            <div className="ai-panel">
              <textarea
                className="ai-panel-textarea"
                placeholder="把杂乱的想法粘贴在这里，AI 帮你整理成任务..."
                value={draftText}
                onChange={function (e) { setDraftText(e.target.value); }}
                rows={3}
              ></textarea>
              <button className="ai-panel-btn" onClick={handleDraft} disabled={aiLoading || !draftText.trim()}>
                {aiLoading ? '处理中...' : '创建任务'}
              </button>
              <button className="ai-panel-close" onClick={function () { setAiPanel(null); }}>✕</button>
            </div>
          )}
          {/* AI 结果面板 */}
          {aiResult && (
            <div className="ai-result-panel">
              <div className="ai-result-content" dangerouslySetInnerHTML={renderMarkdown(aiResult)}></div>
              <button className="ai-panel-close" onClick={function () { setAiResult(''); }}>✕</button>
            </div>
          )}

          {/* 新建表单 */}
          {showCreate && (
            <div className="ai-panel">
              <input className="ai-panel-input" placeholder="任务标题..." value={newTitle}
                onChange={function (e) { setNewTitle(e.target.value); }}
                onKeyDown={function (e) { if (e.key === 'Enter') handleCreate(); }} />
              <select className="ai-panel-select" value={newPriority} onChange={function (e) { setNewPriority(e.target.value); }}>
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 0 auto' }}>
                <label style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>⏰ 截止</label>
                <input
                  type="date"
                  className="ai-panel-input"
                  style={{ width: '130px' }}
                  value={newDueDate}
                  onChange={function (e) { setNewDueDate(e.target.value); }}
                />
              </div>
              <button className="ai-panel-btn" onClick={handleCreate} disabled={actionLoading || !newTitle.trim()}>创建</button>
              <button className="ai-panel-close" onClick={function () { setShowCreate(false); }}>✕</button>
            </div>
          )}

          {/* AI Loading */}
          {aiLoading && (
            <div className="ai-loading-bar">
              <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
              <span className="ms-2">AI 思考中...</span>
            </div>
          )}

          {/* 任务列表 */}
          {tasksLoading ? (
            <div className="task-loading">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">加载任务中...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="task-empty">暂无任务，创建一个或使用 AI 工具吧！</div>
          ) : (
            <div className="task-list">
              {tasks.map(function (task) {
                var isSelected = selectedIds.indexOf(task.id) >= 0;
                var isDropdownOpen = statusDropdownId === task.id;
                return (
                  <div key={task.id} className={'task-card' + (isSelected ? ' selected' : '') + ' priority-' + task.priority}>
                    <div className="task-card-left">
                      <input type="checkbox" checked={isSelected} onChange={function () { toggleSelect(task.id); }} />
                    </div>
                    <div className="task-card-body">
                      <div className="task-card-title">{task.title}</div>
                      {task.description && <div className="task-card-desc">{task.description}</div>}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="task-subtasks">
                          {task.subtasks.map(function (st) {
                            var isSubtaskLoading = subtaskLoading === st.id;
                            return (
                              <div
                                key={st.id}
                                className={'subtask-item subitem-clickable' + (st.completed ? ' completed' : '') + (isSubtaskLoading ? ' subtask-loading' : '')}
                                onClick={async function (e) {
                                  e.stopPropagation();
                                  if (isSubtaskLoading) return;
                                  setSubtaskLoading(st.id);
                                  try {
                                    var updated = await toggleSubtask(st.id);
                                    // 本地更新，不刷新整个列表
                                    setTasks(function (prev) {
                                      return prev.map(function (t) {
                                        if (t.id !== task.id) return t;
                                        var newSubtasks = (t.subtasks || []).map(function (s) {
                                          if (s.id === st.id) return Object.assign({}, s, { completed: updated.completed });
                                          return s;
                                        });
                                        return Object.assign({}, t, { subtasks: newSubtasks });
                                      });
                                    });
                                  } catch (err) {
                                    showToast('操作失败', 'danger');
                                  } finally {
                                    setSubtaskLoading(null);
                                  }
                                }}
                                title="点击切换完成状态"
                              >
                                <span className="subtask-toggle-icon">{isSubtaskLoading ? '⏳' : st.completed ? '✓' : '○'}</span>
                                <span>{' '}{st.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="task-card-meta">
                        <span className={'priority-badge priority-' + task.priority}>{priorityLabel[task.priority] || task.priority}</span>
                        {task.dueDate && <span className="due-date">🗓 {new Date(task.dueDate).toLocaleDateString()}</span>}
                        {/* 状态切换按钮 */}
                        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
                          <button
                            className="status-toggle-btn"
                            onClick={function (e) {
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              setStatusDropdownId(isDropdownOpen ? null : task.id);
                            }}
                          >
                            <span className={'status-dot status-' + task.status + ' status-dot-inline'}></span>
                            {statusLabel[task.status] || task.status}
                            <span className="status-toggle-arrow">▾</span>
                          </button>
                          {isDropdownOpen && (
                            <div className="status-dropdown">
                              {statusOptions.map(function (opt) {
                                return (
                                  <div
                                    key={opt.value}
                                    className={'status-dropdown-item' + (task.status === opt.value ? ' active' : '')}
                                    onClick={function () {
                                      handleStatusChange(task, opt.value);
                                    }}
                                  >
                                    {opt.label}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* 移动端：状态按钮在卡片操作区前面 */}
                      <div className="task-card-meta-mobile">
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            className="status-toggle-btn"
                            onClick={function (e) {
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              setStatusDropdownId(isDropdownOpen ? null : task.id);
                            }}
                          >
                            <span className={'status-dot status-' + task.status + ' status-dot-inline'}></span>
                            {statusLabel[task.status] || task.status}
                            <span className="status-toggle-arrow">▾</span>
                          </button>
                          {isDropdownOpen && (
                            <div className="status-dropdown">
                              {statusOptions.map(function (opt) {
                                return (
                                  <div
                                    key={opt.value}
                                    className={'status-dropdown-item' + (task.status === opt.value ? ' active' : '')}
                                    onClick={function () {
                                      handleStatusChange(task, opt.value);
                                    }}
                                  >
                                    {opt.label}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="task-card-actions">
                      <button className="task-action-btn" onClick={function (e) { e.stopPropagation(); handleBreakdown(task.id); }} title="AI 拆解">🔨</button>
                      <button className="task-action-btn" onClick={function (e) { e.stopPropagation(); handleDelete(task.id); }} title="删除">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};