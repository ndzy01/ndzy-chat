// 消息输入区域组件（角色选择 + 文本框 + 发送按钮）
window.MessageInput = function MessageInput(props) {
  const { selectedRole, onRoleChange, messageInput, onInputChange, onSend, loading } = props;

  const handleKeyDown = function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="input-section">
      {/* 角色选择按钮组 */}
      <div className="role-selector">
        {['user', 'assistant', 'system'].map(function (role) {
          return (
            <button
              key={role}
              className={'role-btn' + (selectedRole === role ? ' active' : '')}
              onClick={function () { onRoleChange(role); }}
              disabled={loading}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          );
        })}
      </div>

      {/* 文本输入 */}
      <div className="input-wrapper">
        <textarea
          value={messageInput}
          onChange={function (e) { onInputChange(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="Enter your message here (Ctrl+Enter or Cmd+Enter to send)..."
          disabled={loading}
        ></textarea>
      </div>

      {/* 发送按钮 */}
      <div className="send-wrapper">
        <button
          className="send-button"
          onClick={onSend}
          disabled={loading}
        >
          {loading ? (
            <span>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Sending...
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
};