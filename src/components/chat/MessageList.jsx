import React, { useEffect, useState, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { ChatIcon } from '../common/Icons';

const getMessageDateGroup = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = nowMidnight.getTime() - dateMidnight.getTime();
  const diffDays = Math.round(diffTime / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
};

function MessageList({
  messages = [],
  currentUserId,
  conversationId = null,
  loading = false,
  highlightedMessageId = null,
  replyingToId = null,
  hasMore = false,
  loadingOlder = false,
  onLoadOlder = null,
  onReply = null,
  onForward = null,
  onEdit = null,
  onDelete = null,
  onDeleteForMe = null,
  onCreateTodo = null,
  onShowInfo = null,
  onSelectMessage = null,
  onReaction = null,
  savedMessageIds = new Set(),
  onSave = null,
  onUnsave = null,
  onPin = null,
  onUnpin = null,
  onMarkLinkCopied = null,
  onOpenPollModal = null,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const prevConvIdRef = useRef(null);
  const initialScrollDoneRef = useRef(false);
  const [initialUnreadId, setInitialUnreadId] = useState(null);

  // When conversation scope changes or when messages first load for this conversation
  useEffect(() => {
    if (conversationId !== prevConvIdRef.current) {
      prevConvIdRef.current = conversationId;
      initialScrollDoneRef.current = false;

      if (messages && messages.length > 0 && currentUserId) {
        const uidStr = currentUserId.toString();
        const firstUnread = messages.find((msg) => {
          const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
          if (!senderId || senderId === uidStr) return false;
          const isReadByMe = Array.isArray(msg.readBy) && msg.readBy.some(
            (r) => (r.userId?._id || r.userId || r)?.toString() === uidStr
          );
          return !msg.isRead || !isReadByMe;
        });

        setInitialUnreadId(firstUnread ? (firstUnread._id || firstUnread.id)?.toString() : null);
      } else {
        setInitialUnreadId(null);
      }
    } else if (!initialScrollDoneRef.current && messages && messages.length > 0 && currentUserId && !initialUnreadId) {
      // If messages arrived shortly after conversationId set
      const uidStr = currentUserId.toString();
      const firstUnread = messages.find((msg) => {
        const senderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
        if (!senderId || senderId === uidStr) return false;
        const isReadByMe = Array.isArray(msg.readBy) && msg.readBy.some(
          (r) => (r.userId?._id || r.userId || r)?.toString() === uidStr
        );
        return !msg.isRead || !isReadByMe;
      });

      if (firstUnread) {
        setInitialUnreadId((firstUnread._id || firstUnread.id)?.toString());
      }
    }
  }, [conversationId, messages, currentUserId, initialUnreadId]);

  // Handle scrolling
  useEffect(() => {
    if (!containerRef.current || messages.length === 0) return;

    if (highlightedMessageId) {
      const el = document.getElementById(`msg-${highlightedMessageId}`);
      if (el && containerRef.current) {
        const elTop = el.offsetTop;
        containerRef.current.scrollTo({
          top: Math.max(0, elTop - containerRef.current.clientHeight / 2),
          behavior: 'smooth',
        });
        return;
      }
    }

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      if (initialUnreadId) {
        const unreadEl =
          document.getElementById(`unread-divider-${conversationId}`) ||
          document.getElementById(`msg-${initialUnreadId}`);

        if (unreadEl && containerRef.current) {
          const elTop = unreadEl.offsetTop;
          containerRef.current.scrollTo({
            top: Math.max(0, elTop - 20),
            behavior: 'auto',
          });
          return;
        }
      }

      // No unread messages: scroll to bottom (showing the last message)
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'auto',
      });
    } else {
      // Subsequent updates (e.g. sending a message or receiving a new message while viewing)
      const container = containerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      const lastMsg = messages[messages.length - 1];
      const lastSenderId = (lastMsg?.sender?._id || lastMsg?.sender?.id || lastMsg?.sender)?.toString();
      const isMyMessage = Boolean(lastSenderId && lastSenderId === currentUserId?.toString());

      if (isNearBottom || isMyMessage) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, highlightedMessageId, initialUnreadId, conversationId, currentUserId]);

  if (loading) {
    return (
      <div className="message-list-container empty-messages-center">
        <span className="empty-chat-hint">Loading conversation history...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-list-container empty-messages-center">
        <div className="empty-chat-box">
          <div className="empty-chat-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChatIcon size={38} color="#0284c7" strokeWidth={1.75} />
          </div>
          <p className="empty-chat-title">No messages yet</p>
          <p className="empty-chat-hint">Send a message below to start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list-container" ref={containerRef}>
      {/* Load Older Messages Pagination Header */}
      {hasMore && (
        <div className="load-older-container">
          <button
            type="button"
            className="btn-load-older-messages"
            onClick={onLoadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder ? (
              <span>Loading older messages...</span>
            ) : (
              <span>↑ Load older messages</span>
            )}
          </button>
        </div>
      )}

      <div className="messages-stream">
        {messages.map((msg, index) => {
          const msgId = (msg._id || msg.id)?.toString();
          const isTarget = highlightedMessageId && msgId === highlightedMessageId.toString();
          const isFirstUnread = initialUnreadId && msgId === initialUnreadId.toString();
          const prevMsg = index > 0 ? messages[index - 1] : null;

          const currentGroup = getMessageDateGroup(msg.createdAt);
          const prevGroup = prevMsg ? getMessageDateGroup(prevMsg.createdAt) : null;
          const showDateDivider = currentGroup !== prevGroup && currentGroup !== '';

          const currentSenderId = (msg.sender?._id || msg.sender?.id || msg.sender)?.toString();
          const prevSenderId = prevMsg ? (prevMsg.sender?._id || prevMsg.sender?.id || prevMsg.sender)?.toString() : null;
          const currentTime = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
          const prevTime = prevMsg?.createdAt ? new Date(prevMsg.createdAt).getTime() : 0;
          const isWithinTimeWindow = !currentTime || !prevTime || Math.abs(currentTime - prevTime) < 5 * 60 * 1000;

          // Reset consecutive check if there's a date divider or unread divider
          const isConsecutive = Boolean(
            !showDateDivider &&
            !isFirstUnread &&
            prevSenderId &&
            currentSenderId === prevSenderId &&
            !msg.type &&
            !prevMsg.type &&
            isWithinTimeWindow
          );

          return (
            <React.Fragment key={msgId || msg.createdAt}>
              {isFirstUnread && (
                <div className="unread-messages-divider" id={`unread-divider-${conversationId}`}>
                  <span>Unread Messages</span>
                </div>
              )}
              {showDateDivider && (
                <div className="message-date-divider">
                  <span>{currentGroup}</span>
                </div>
              )}
              <MessageBubble
                key={msgId || msg.createdAt}
                message={msg}
                currentUserId={currentUserId}
                isHighlighted={isTarget}
                isReplyTarget={Boolean(replyingToId && msgId === replyingToId)}
                isConsecutive={isConsecutive}
                onReply={onReply}
                onForward={onForward}
                onEdit={onEdit}
                onDelete={onDelete}
                onDeleteForMe={onDeleteForMe}
                onCreateTodo={onCreateTodo}
                onShowInfo={onShowInfo}
                onSelectMessage={onSelectMessage}
                onReaction={onReaction}
                isSaved={savedMessageIds.has(msgId)}
                isPinned={Boolean(msg.pinned)}
                onSave={onSave}
                onUnsave={onUnsave}
                onPin={onPin}
                onUnpin={onUnpin}
                onMarkLinkCopied={onMarkLinkCopied}
                onOpenPollModal={onOpenPollModal}
              />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default MessageList;
