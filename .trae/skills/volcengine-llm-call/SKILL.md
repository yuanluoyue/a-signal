---
name: volcengine-llm-call
description: 开发火山引擎llm调用的时候参考
---

# 火山引擎大模型调用 demo
官方文档 https://www.volcengine.com/docs/82379/1494384?lang=zh

调用对应的 llm 模型时，可以参考以下官方 demo
```
curl --location 'https://ark.cn-beijing.volces.com/api/v3/responses' \
--header "Authorization: Bearer $ARK_API_KEY" \
--header 'Content-Type: application/json' \
--data '{
    "model": "deepseek-v3-2-251201",
    "stream": true,
    "tools": [
        {
            "type": "web_search",
            "max_keyword": 3
        }
    ],
    "input": [
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "今天有什么热点新闻"
                }
            ]
        }
    ]
}'
```

```
curl https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer $ARK_API_KEY" \
   -d '{
    "model": "doubao-embedding-vision-251215",
    "input": [
        {
            "type":"text",
            "text":"天很蓝，海很深"
        },
        {    
            "type":"image_url",
            "image_url":{
                "url":"https://ark-project.tos-cn-beijing.volces.com/images/view.jpeg"
            }
        }
      ]
}'
```