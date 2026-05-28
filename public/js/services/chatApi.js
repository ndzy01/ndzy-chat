// ========== 会话 API ==========

// 获取所有会话列表
async function getConversations() {
  var response = await fetch('/api/conversations');
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

// 新建会话
async function createConversation(title) {
  var response = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || 'New Conversation' }),
  });
  if (!response.ok) throw new Error('Failed to create conversation');
  return response.json();
}

// 获取单个会话详情（含消息）
async function getConversation(id) {
  var response = await fetch('/api/conversations/' + id);
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
}

// 删除会话
async function deleteConversation(id) {
  var response = await fetch('/api/conversations/' + id, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete conversation');
  return response.json();
}

// 更新会话标题
async function updateConversationTitle(id, title) {
  var response = await fetch('/api/conversations/' + id + '/title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title }),
  });
  if (!response.ok) throw new Error('Failed to update title');
  return response.json();
}

// ========== 聊天 API ==========

// 发送聊天请求
async function sendChatRequest(messages, conversationId) {
  var response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages, conversationId: conversationId }),
  });
  if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
  return response.json();
}