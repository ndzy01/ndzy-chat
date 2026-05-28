// Toast 通知
function showToast(message, type) {
  type = type || 'info';
  var alertDiv = document.createElement('div');
  alertDiv.className =
    'alert alert-' +
    type +
    ' alert-dismissible fade show toast-notification';
  alertDiv.innerHTML =
    message +
    '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
  document.body.appendChild(alertDiv);

  setTimeout(function () {
    alertDiv.remove();
  }, 3000);
}

// 角色对应 Badge 颜色
function getRoleBadgeColor(role) {
  switch (role) {
    case 'user':
      return 'primary';
    case 'assistant':
      return 'success';
    case 'system':
      return 'warning';
    default:
      return 'secondary';
  }
}

// Markdown 安全渲染
function renderMarkdown(content) {
  var rawHtml = marked.parse(content || '', {
    gfm: true,
    breaks: true,
  });
  var safeHtml = DOMPurify.sanitize(rawHtml);
  return { __html: safeHtml };
}