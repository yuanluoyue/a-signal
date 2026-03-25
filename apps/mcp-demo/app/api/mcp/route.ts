import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const body = await request.json();
    
    // 获取 headers
    const apiKey = request.headers.get('x-api-key');
    const contentType = request.headers.get('content-type') || 'application/json';
    
    // 构建 headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    // 转发请求到后端
    const response = await fetch('http://localhost:3001/api/v1/mcp', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    // 获取响应数据
    const data = await response.json();
    
    // 返回响应
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('MCP proxy error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal proxy error',
        },
      },
      { status: 500 }
    );
  }
}

// 支持 GET 请求（用于 tools 文档）
export async function GET(request: NextRequest) {
  try {
    // 转发请求到后端
    const response = await fetch('http://localhost:3001/api/v1/mcp/tools', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // 获取响应数据
    const data = await response.json();
    
    // 返回响应
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('MCP proxy error:', error);
    return NextResponse.json(
      { error: 'Internal proxy error' },
      { status: 500 }
    );
  }
}
