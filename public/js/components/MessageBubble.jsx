// 单条消息气泡组件
window.MessageBubble = function MessageBubble(props) {
  const { message, index, onDelete } = props;
  const isAssistant = message.role === 'assistant';

  return (
    <div className={'message-item ' + (isAssistant ? 'assistant' : 'user')}>
      <div className={'message-bubble ' + (isAssistant ? 'assistant' : 'user')}>
        {isAssistant ? (
          <div
            className="message-content"
            dangerouslySetInnerHTML={renderMarkdown(message.content)}
          ></div>
        ) : (
          <div
            className="message-content"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {message.content}
          </div>
        )}
        <button
          className="btn btn-sm btn-outline-danger delete-btn"
          onClick={function () { onDelete(index); }}
        >
          删除
        </button>
      </div>
    </div>
  );
};