import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layout,
  List,
  Input,
  Button,
  Avatar,
  Typography,
  Spin,
  Empty,
  Tag,
  Tooltip,
  Popconfirm,
  Modal,
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  LoadingOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useUser } from '@/contexts/UserContext';
import { getToken } from '@/utils/auth';
import client from '@/services/client';
import { Bubble } from '@ant-design/x';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import styles from './index.module.scss';

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;

// 预处理 Markdown 内容：合并连续换行
const preprocessMarkdown = (content: string): string => {
  return content
    .replace(/\n{2,}/g, '\n')
    .trim();
};

// Markdown 渲染组件 - 使用 remark-gfm
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const [plugins, setPlugins] = useState<PluggableList>([]);

  useEffect(() => {
    import('remark-gfm').then((mod) => {
      setPlugins([mod.default]);
    });
  }, []);

  const processedContent = preprocessMarkdown(content);

  return (
    <div className={styles.markdownContent}>
      <ReactMarkdown remarkPlugins={plugins}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

// 打字机效果组件
const TypewriterContent: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
  const [displayContent, setDisplayContent] = useState('');
  const contentRef = useRef(content);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayContent(content);
      return;
    }

    if (content.length > contentRef.current.length) {
      contentRef.current = content;
    }

    const typeNextChar = () => {
      if (indexRef.current < contentRef.current.length) {
        setDisplayContent(contentRef.current.slice(0, indexRef.current + 1));
        indexRef.current++;
      }
    };

    const timer = setInterval(typeNextChar, 15);

    return () => clearInterval(timer);
  }, [content, isStreaming]);

  useEffect(() => {
    if (content && indexRef.current === 0) {
      contentRef.current = content;
    }
  }, []);

  return <MarkdownContent content={displayContent} />;
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
}

interface SseEvent {
  event: 'thinking' | 'tool' | 'answer' | 'done' | 'error';
  data: unknown;
}

const AgentChatPage: React.FC = () => {
  const { loading } = useUser();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [thinkingStatus, setThinkingStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前对话
  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, streamingContent, thinkingStatus]);

  // 加载历史对话
  useEffect(() => {
    console.log('[AgentChat] loading:', loading);
    if (!loading) {
      loadConversations();
    }
  }, [loading]);

  const loadConversations = async () => {
    console.log('[AgentChat] Loading conversations');
    setIsLoadingHistory(true);
    try {
      const result: any = await client.get('/agent/sessions');
      console.log('[AgentChat] Sessions response:', result);

      const sessions = result.sessions || result.data?.sessions || [];
      console.log('[AgentChat] Sessions to load:', sessions);
      if (sessions.length > 0) {
        const loadedConversations: Conversation[] = [];
        for (const sessionId of sessions) {
          console.log('[AgentChat] Loading history for session:', sessionId);
          const historyData = await client.get('/agent/history', { params: { sessionId } });
          console.log('[AgentChat] History data for session', sessionId, ':', historyData);

          const messages = historyData.data || historyData || [];
          if (messages.length > 0) {
            const mappedMessages: Message[] = messages.map((msg: any, index: number) => ({
              id: `${sessionId}_${index}`,
              role: msg.role,
              content: msg.content,
              timestamp: Date.now() - (messages.length - index) * 1000,
            }));

            const firstUserMessage = mappedMessages.find((m) => m.role === 'user');
            loadedConversations.push({
              id: sessionId,
              title: firstUserMessage ? firstUserMessage.content.slice(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '') : '历史对话',
              lastMessage: mappedMessages[mappedMessages.length - 1]?.content || '',
              timestamp: Date.now(),
              messages: mappedMessages,
            });
          }
        }
        console.log('[AgentChat] Loaded conversations:', loadedConversations);
        setConversations(loadedConversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 创建新对话
  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      title: '新对话',
      lastMessage: '',
      timestamp: Date.now(),
      messages: [],
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setInputValue('');
    setStreamingContent('');
  };

  // 删除对话
  const deleteConversation = async (id: string) => {
    try {
      await client.delete('/agent/session', { params: { sessionId: id } });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId('');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // 开始编辑对话名称
  const startEditTitle = (conversation: Conversation) => {
    setEditingConversation(conversation);
    setNewTitle(conversation.title);
  };

  // 保存对话名称
  const saveTitle = async () => {
    if (editingConversation && newTitle.trim()) {
      try {
        await client.put('/agent/session/title', {
          sessionId: editingConversation.id,
          title: newTitle.trim(),
        });
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === editingConversation.id ? { ...conv, title: newTitle.trim() } : conv
          )
        );
      } catch (error) {
        console.error('Error updating session title:', error);
      }
    }
    setEditingConversation(null);
    setNewTitle('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingConversation(null);
    setNewTitle('');
  };

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    // 如果没有当前对话，创建一个新对话
    let conversationId = currentConversationId;
    if (!conversationId) {
      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        title: message.slice(0, 20) + (message.length > 20 ? '...' : ''),
        lastMessage: message,
        timestamp: Date.now(),
        messages: [],
      };
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
      conversationId = newConversation.id;
    }

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              lastMessage: message,
              timestamp: Date.now(),
            }
          : conv
      )
    );

    setIsLoading(true);
    setStreamingContent('');
    setThinkingStatus('思考中...');

    try {
      console.log('[AgentChat] Sending message with sessionId:', conversationId);
      const token = getToken();
      const response = await fetch('/api/v1/agent/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: conversationId,
          message,
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const eventMatch = trimmed.match(/event: (\w+)/);
          const dataMatch = trimmed.match(/data: (.+)/s);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1] as SseEvent['event'];
            const data = JSON.parse(dataMatch[1]);

            if (event === 'thinking') {
              const nodeName = data.node || data.message || '';
              setThinkingStatus(nodeName);
            } else if (event === 'tool') {
              setThinkingStatus(`正在使用工具: ${data.tool || ''}...`);
            } else if (event === 'answer' && data.chunk) {
              setThinkingStatus('');
              fullContent += data.chunk;
              setStreamingContent(fullContent);
            }
          }
        }
      }

      // 添加助手消息
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, assistantMessage],
                lastMessage: fullContent.slice(0, 50) + (fullContent.length > 50 ? '...' : ''),
                timestamp: Date.now(),
              }
            : conv
        )
      );
      setStreamingContent('');
    } catch (error) {
      console.error('Chat error:', error);
      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生错误，请稍后重试。',
        timestamp: Date.now(),
      };
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
      setThinkingStatus('');
    }
  }, [inputValue, isLoading, currentConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时间
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.chatPage}>
      <Layout className={styles.chatLayout}>
        {/* 左侧对话列表 */}
        <Sider width={200} className={styles.sider} theme="light">
          <div className={styles.siderHeader}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              size="small"
              onClick={createNewConversation}
            >
              新建对话
            </Button>
          </div>
          {isLoadingHistory ? (
            <div className={styles.loadingHistory}>
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>加载中...</Text>
            </div>
          ) : (
            <List
              className={styles.conversationList}
              dataSource={conversations}
              renderItem={(item) => (
                <List.Item
                  className={`${styles.conversationItem} ${
                    item.id === currentConversationId ? styles.active : ''
                  }`}
                  onClick={() => setCurrentConversationId(item.id)}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<MessageOutlined />} size="small" />}
                    title={
                      <div className={styles.conversationTitle}>
                        {item.title}
                      </div>
                    }
                    description={
                      <div className={styles.conversationDesc}>
                        {item.lastMessage || '暂无消息'}
                      </div>
                    }
                  />
                  <div className={styles.conversationActions}>
                    <Tooltip key="edit" title="修改名称">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        style={{ padding: '0 4px', minWidth: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditTitle(item);
                        }}
                      />
                    </Tooltip>
                    <Popconfirm
                      key="delete"
                      title="删除对话"
                      description="确定要删除这个对话吗？"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        deleteConversation(item.id);
                      }}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ padding: '0 4px', minWidth: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: '暂无对话，点击上方按钮创建' }}
            />
          )}
        </Sider>

        {/* 右侧对话内容 */}
        <Content className={styles.chatContent}>
          {!currentConversation ? (
            <div className={styles.emptyState}>
              <Empty
                image={<RobotOutlined style={{ fontSize: 64, color: '#1890ff' }} />}
                description={
                  <div className={styles.welcomeText}>
                    <h2>AI 投研助手</h2>
                    <p>基于 LangGraph 的智能投资分析 Agent</p>
                    <div className={styles.featureTags}>
                      <Tag color="blue">持仓分析</Tag>
                      <Tag color="green">新闻查询</Tag>
                      <Tag color="orange">信号分析</Tag>
                      <Tag color="purple">回测数据</Tag>
                      <Tag color="cyan">研投报告</Tag>
                    </div>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={createNewConversation}
                      style={{ marginTop: 24 }}
                    >
                      开始新对话
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              {/* 消息列表 */}
              <div className={`${styles.messageList} chat-message-list`}>
                {currentConversation.messages.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <Text type="secondary">发送消息开始对话...</Text>
                  </div>
                ) : (
                  currentConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`${styles.messageItem} ${
                        msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                      }`}
                    >
                      <div className={styles.messageWrapper}>
                        <Avatar
                          icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                          className={msg.role === 'user' ? styles.userAvatar : styles.assistantAvatar}
                        />
                        <div className={styles.messageBubble}>
                          <div className={styles.messageContent}>
                            <MarkdownContent content={msg.content} />
                          </div>
                          <div className={styles.messageTime}>{formatTime(msg.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {streamingContent && (
                  <div className={`${styles.messageItem} ${styles.assistantMessage}`}>
                    <div className={styles.messageWrapper}>
                      <Avatar
                        icon={<RobotOutlined />}
                        className={styles.assistantAvatar}
                      />
                      <div className={styles.messageBubble}>
                        <div className={styles.messageContent}>
                          <TypewriterContent content={streamingContent} isStreaming={true} />
                        </div>
                        <div className={styles.typingIndicator}>
                          <Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* 思考中状态 */}
                {thinkingStatus && !streamingContent && (
                  <div className={`${styles.messageItem} ${styles.assistantMessage}`}>
                    <div className={styles.messageWrapper}>
                      <Avatar
                        icon={<RobotOutlined />}
                        className={styles.assistantAvatar}
                      />
                      <div className={styles.messageBubble}>
                        <div className={styles.thinkingStatus}>
                          <Spin size="small" style={{ marginRight: 8 }} />
                          <span>{thinkingStatus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 */}
              <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                  <TextArea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="请输入您的问题，例如：分析我的持仓、查询最近的新闻..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    disabled={isLoading}
                    className={styles.textArea}
                  />
                  <Tooltip title="发送">
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSend}
                      loading={isLoading}
                      disabled={!inputValue.trim()}
                      className={styles.sendButton}
                    />
                  </Tooltip>
                </div>
                <div className={styles.inputHint}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    按 Enter 发送，Shift + Enter 换行
                  </Text>
                </div>
              </div>
            </>
          )}
        </Content>
      </Layout>

      {/* 编辑对话名称弹窗 */}
      <Modal
        title="修改对话名称"
        open={!!editingConversation}
        onOk={saveTitle}
        onCancel={cancelEdit}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="请输入对话名称"
          onPressEnter={saveTitle}
        />
      </Modal>
    </div>
  );
};

export default AgentChatPage;
