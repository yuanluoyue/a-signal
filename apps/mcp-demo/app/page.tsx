'use client';

import { useState } from 'react';
import { createMcpClient, type McpTool } from '@/lib/mcp-client';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [showTools, setShowTools] = useState(false);

  const client = createMcpClient(apiKey);

  const handleListTools = async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const toolList = await client.listTools();
      setTools(toolList);
      setShowTools(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取 tools 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryNews = async () => {
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }

    if (!keyword.trim()) {
      setError('请输入关键词');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setShowTools(false);

    try {
      const data = await client.queryNews(keyword, 5);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询新闻失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>MCP Demo</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        演示如何调用 MCP 服务进行新闻查询
      </p>

      {/* API Key 输入 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          API Key
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="请输入您的 API Key"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 14,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          在请求头中会自动添加: x-api-key: YOUR_API_KEY
        </p>
      </div>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <button
          onClick={handleListTools}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '加载中...' : '获取 Tools 列表'}
        </button>
      </div>

      {/* 关键词输入 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          搜索关键词
        </label>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例如：新能源"
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleQueryNews}
            disabled={loading}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              backgroundColor: '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '查询中...' : '查询新闻'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
            color: '#ff4d4f',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {/* Tools 列表 */}
      {showTools && tools.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>可用 Tools</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tools.map((tool) => (
              <div
                key={tool.name}
                style={{
                  padding: 16,
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 6,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {tool.name}
                </div>
                <div style={{ fontSize: 14, color: '#666' }}>
                  {tool.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 查询结果 */}
      {result && (
        <div>
          <h3 style={{ fontSize: 18, marginBottom: 16 }}>查询结果</h3>
          <pre
            style={{
              padding: 16,
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 6,
              overflow: 'auto',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* 使用说明 */}
      <div
        style={{
          marginTop: 40,
          padding: 20,
          backgroundColor: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 6,
        }}
      >
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>使用说明</h3>
        <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
          <li>在主系统中创建 API Key（设置 → API Key 管理）</li>
          <li>将生成的 API Key 复制到上方输入框</li>
          <li>点击"获取 Tools 列表"查看可用的 MCP tools</li>
          <li>输入关键词，点击"查询新闻"测试调用</li>
        </ol>
      </div>
    </main>
  );
}
