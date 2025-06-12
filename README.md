# LuckyCola MCP 服务

基于LuckyCola开放开放能力的MCP（Model Context Protocol）服务。

## 功能特性

- 标准化的MCP接口，兼容各种MCP客户端
- 环境变量配置，安全便捷
- 在线图片合规性检查，确保内容安全
- 菜谱查询工具，获取菜品制作方法

## 安装依赖

```bash
cd luckycola-mcp
yarn install
```

## 编译项目

```bash
yarn build
```

## 环境变量配置

设置以下环境变量：

```bash
export LUCKYCOLA_OPEN_KEY="你账户在LuckyCola平台的APPKey"
export LUCKYCOLA_OPEN_UID="你账户在LuckyCola平台的uid"
```

### 获取API密钥和UID

1. 访问 [LuckyCola官网-个人中心](https://luckycola.com.cn/)
2. 登录后进入"个人中心"页面，获取APPKey和用户ID(uid)
3. 确保账号已相关API权限及额度

## 使用方法

### 直接运行

```bash
node build/index.js
```

### 作为MCP服务器

在MCP客户端（如Claude Desktop、Cursor等）中配置此服务：

```json
{
  "mcpServers": {
    "luckycola-mcp": {
      "command": "node",
      "args": ["/path/to/luckycola-mcp/build/index.js"],
      "env": {
        "LUCKYCOLA_OPEN_KEY": "你的APPKey",
        "LUCKYCOLA_OPEN_UID": "你的UID"
      }
    }
  }
}
```

## API接口

### checkImage

检查在线图片是否合规的工具

**参数：**

| 参数名   | 类型   | 说明           |
|----------|--------|----------------|
| imgUrl   | string | 需要检查的图片URL |

**返回：**
- 成功时返回图片合规性检测结果，包括安全状态、安全分数、检测详情等。
- 失败时返回错误信息。

**返回示例：**
```json
{
  "content": [
    {
      "type": "text",
      "text": "图片合规检测结果：\n\n提示: ...\n安全状态: 合规\n安全分数: 99.00%\n检测详情: {...}"
    }
  ]
}
```

---

### getFoodMenu

获取菜品的菜谱（制作方法）

**参数：**

| 参数名     | 类型   | 说明           |
|------------|--------|----------------|
| foodTitle  | string | 需要查询的菜品名称 |

**返回：**
- 成功时返回菜谱详情，包括简介、图片、步骤、注意事项、配料、时长等。
- 失败时返回错误信息。

**返回示例：**
```json
{
  "content": [
    {
      "type": "text",
      "text": "番茄炒蛋的菜谱结果如下：\n\n{\"intro\":\"...\",\"image\":\"...\",\"steps\":[...],\"notice\":\"...\",\"ingredients\":[...],\"duration\":\"...\"}"
    }
  ]
}
```

---

## 使用示例

```typescript
// 在MCP客户端中调用
// 检查图片合规
await callTool("checkImage", { imgUrl: "https://example.com/image.jpg" });

// 获取菜谱
await callTool("getFoodMenu", { foodTitle: "番茄炒蛋" });
```

---

## 项目结构

```
luckycola-mcp/
├── build/                  # 编译后输出目录
├── src/                    # 源码目录
│   ├── api/                # API接口配置
│   │   └── index.ts
│   ├── config/             # 配置相关
│   │   └── constants.ts
│   ├── services/           # 业务服务
│   │   └── service.ts
│   ├── types/              # 类型定义
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   └── index.ts
│   └── index.ts            # 入口文件
├── package.json
├── tsconfig.json
├── yarn.lock
├── LICENSE
└── README.md
```

---

## 工具函数说明

- `formatQuery(parameters: Record<string, string>): string`  
  用于将对象参数格式化为URL查询字符串，按key排序。

---

## 注意事项

1. 确保网络连接正常，能够访问LuckyCola API
2. API调用需要消耗额度，请注意使用量

## 故障排除

### 常见错误

1. **环境变量未设置**：确保设置了正确的APPKey和uid
2. **网络连接问题**：检查网络连接和防火墙设置
3. **API配额不足**：检查LuckyCola账户余额和API调用次数
4. **提示词不合规**：确保提示词符合内容安全规范

## 许可证

ISC License 