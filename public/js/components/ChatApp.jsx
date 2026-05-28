// 顶部标题栏组件
window.ChatHeader = function ChatHeader(props) {
  return (
    <div className="chat-header">
      <h1>🤖 {props.title || 'NDZY Chat'}</h1>
    </div>
  );
};

// 主应用组件
window.ChatApp = function ChatApp() {
  const { useState, useEffect, useRef } = React;

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [deletingMessageIndex, setDeletingMessageIndex] = useState(null);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const editInputRef = useRef(null);

  // 加载会话列表
  async function loadConversations() {
    setConversationsLoading(true);
    try {
      var list = await getConversations();
      setConversations(list);
      // 如果未激活任何会话但有会话列表，自动选第一个
      if (!activeId && list.length > 0) {
        selectConversation(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  }

  // 初始化加载
  useEffect(function () {
    loadConversations();
  }, []);

  // 自动滚动
  useEffect(
    function () {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    },
    [messages],
  );

  // 选择会话（加载消息 + 过渡动画）
  async function selectConversation(id) {
    if (id === activeId) return;
    setTransitioning(true);
    setMessagesLoading(true);
    setActiveId(id);
    try {
      var conv = await getConversation(id);
      // 短暂延迟让过渡动画可见
      await new Promise(function (r) { setTimeout(r, 150); });
      if (conv && conv.messages) {
        setMessages(
          conv.messages.map(function (m) {
            return { role: m.role, content: m.content };
          }),
        );
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setMessages([]);
    } finally {
      setTransitioning(false);
      setMessagesLoading(false);
    }
  }

  // 开始编辑标题
  function startEdit(conv) {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    // 等 DOM 更新后 focus
    setTimeout(function () {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 50);
  }

  // 保存标题
  async function saveTitle(id) {
    var title = editTitle.trim() || 'New Conversation';
    setActionLoading(true);
    try {
      await updateConversationTitle(id, title);
      setConversations(function (prev) {
        return prev.map(function (c) {
          if (c.id === id) {
            return Object.assign({}, c, { title: title });
          }
          return c;
        });
      });
    } catch (err) {
      showToast('Failed to update title', 'danger');
    } finally {
      setEditingId(null);
      setActionLoading(false);
    }
  }

  // 取消编辑
  function cancelEdit() {
    setEditingId(null);
  }

  // 处理标题编辑键盘事件
  function handleTitleKeyDown(e, id) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

  // 新建会话
  async function handleNewConversation() {
    setActionLoading(true);
    try {
      var conv = await createConversation('New Conversation');
      setConversations(function (prev) {
        return [conv].concat(prev);
      });
      setActiveId(conv.id);
      setMessages([]);
    } catch (err) {
      showToast('Failed to create conversation', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  // 删除会话
  async function handleDeleteConversation(id) {
    if (!confirm('Delete this conversation?')) return;
    setActionLoading(true);
    try {
      await deleteConversation(id);
      setConversations(function (prev) {
        return prev.filter(function (c) {
          return c.id !== id;
        });
      });
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (err) {
      showToast('Failed to delete conversation', 'danger');
    } finally {
      setActionLoading(false);
    }
  }

  // 发送消息
  async function handleSend() {
    if (!activeId) {
      showToast('Please create or select a conversation first', 'warning');
      return;
    }

    var updatedMessages = messages;

    // 有输入内容则先添加，固定 role 为 user
    if (messageInput.trim()) {
      var newMsg = {
        role: 'user',
        content: messageInput,
      };
      updatedMessages = messages.concat([newMsg]);
      setMessages(updatedMessages);
      setMessageInput('');
    }

    if (updatedMessages.length === 0) {
      showToast('Please enter a message', 'danger');
      return;
    }

    setLoading(true);
    try {
      var result = await sendChatRequest(updatedMessages, activeId);
      if (result.content) {
        setMessages(function (prev) {
          return prev.concat([
            { role: 'assistant', content: result.content },
          ]);
        });
      }
      showToast('Response received!', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }

  // 键盘快捷键
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  // 删除消息（仅前端移除，后端通过会话重载刷新）
  function handleDeleteMessage(index) {
    setMessages(function (prev) {
      return prev.filter(function (_, i) {
        return i !== index;
      });
    });
    showToast('Message deleted', 'info');
  }

  // 格式化时间
  function formatTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="chat-shell">
      {/* 左侧会话列表 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="new-conv-btn" onClick={handleNewConversation} disabled={actionLoading}>
            {actionLoading ? 'Creating...' : '+ New Conversation'}
          </button>
        </div>
        <div className="conversation-list">
          {conversationsLoading ? (
            <div className="sidebar-loading">
              <div className="spinner-border text-primary spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="ms-2">Loading...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="no-conversations">No conversations yet</div>
          ) : (
            conversations.map(function (conv) {
              return (
                <div
                  key={conv.id}
                  className={
                    'conversation-item' +
                    (activeId === conv.id ? ' active' : '')
                  }
                  onClick={function () {
                    if (editingId !== conv.id) {
                      selectConversation(conv.id);
                    }
                  }}
                >
                  {editingId === conv.id ? (
                    <div className="conversation-title-edit">
                      <input
                        ref={editInputRef}
                        className="title-edit-input"
                        value={editTitle}
                        onChange={function (e) { setEditTitle(e.target.value); }}
                        onKeyDown={function (e) { handleTitleKeyDown(e, conv.id); }}
                        onBlur={function () { saveTitle(conv.id); }}
                        onClick={function (e) { e.stopPropagation(); }}
                        disabled={actionLoading}
                      />
                    </div>
                  ) : (
                    <div
                      className="conversation-title"
                      onDoubleClick={function (e) {
                        e.stopPropagation();
                        startEdit(conv);
                      }}
                      title="Double click to rename"
                    >
                      {conv.title}
                    </div>
                  )}
                  <div className="conversation-time">
                    {formatTime(conv.createdAt)}
                  </div>
                  <button
                    className="conv-delete-btn"
                    onClick={function (e) {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    title="Delete conversation"
                    disabled={actionLoading}
                  >
                    {actionLoading ? '⏳' : '🗑'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧聊天区 */}
      <div className="chat-main">
        <ChatHeader
          title={
            activeId
              ? (conversations.find(function (c) { return c.id === activeId; }) || {}).title || 'New Conversation'
              : 'NDZY Chat'
          }
        />

        <div className="chat-body">
          {/* 消息列表 */}
          <div className="messages-section">
            <div className={'messages-container' + (transitioning ? ' transitioning' : '')} ref={messagesContainerRef}>
              {messagesLoading ? (
                <div className="messages-loading">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading messages...</p>
                </div>
              ) : !activeId ? (
                <div className="text-center text-muted py-5">
                  Create a new conversation or select one to start chatting
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted py-5">
                  No messages yet. Type something to start!
                </div>
              ) : (
                messages.map(function (msg, index) {
                  return (
                    <MessageBubble
                      key={index}
                      message={msg}
                      index={index}
                      onDelete={handleDeleteMessage}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="input-section">
            {/* 文本输入 */}
            <div className="input-wrapper">
              <textarea
                value={messageInput}
                onChange={function (e) {
                  setMessageInput(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeId
                    ? 'Enter your message (Ctrl+Enter to send)...'
                    : 'Select a conversation first...'
                }
                disabled={loading || !activeId}
              ></textarea>
            </div>

            {/* 发送按钮 */}
            <div className="send-wrapper">
              <button
                className="send-button"
                onClick={handleSend}
                disabled={loading || !activeId}
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
        </div>
      </div>
    </div>
  );
};