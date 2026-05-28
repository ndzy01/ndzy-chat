// 顶层应用组件 — 在 TaskBoard 和 Chat 之间切换
window.App = function App() {
  const { useState } = React;
  const [view, setView] = useState('tasks'); // 'tasks' | 'chat'

  return (
    <div className="app-shell">
      {/* 顶部导航栏 */}
      <nav className="top-nav">
        <button
          className={'nav-tab' + (view === 'tasks' ? ' active' : '')}
          onClick={function () { setView('tasks'); }}
        >
          📋 任务看板
        </button>
        <button
          className={'nav-tab' + (view === 'chat' ? ' active' : '')}
          onClick={function () { setView('chat'); }}
        >
          💬 AI 聊天
        </button>
      </nav>

      {/* 内容区 */}
      <div className="app-content">
        {view === 'tasks' ? <TaskBoard /> : <ChatApp />}
      </div>
    </div>
  );
};