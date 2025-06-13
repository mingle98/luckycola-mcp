# LuckyCola MCP 服务

基于LuckyCola开放能力的MCP（Model Context Protocol）服务。

## 功能特性

- 标准化的MCP接口，兼容各种MCP客户端
- 环境变量配置，安全便捷
- 在线图片合规性检查，确保内容安全
- 菜谱查询工具，获取菜品制作方法
- 丰富的文件操作功能，支持文件修改、删除、重命名等
- 图片压缩功能，优化图片大小
- 图片OCR功能,轻松获取图片中的文字信息

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
export MCP_FILE_PATH="希望进行文件/图片操作(文件修改、删除、重命名等)的目录路径"
```

nodejs版本要求：v21.0.0及以上

### 获取API密钥和UID

1. 访问 [LuckyCola官网-用户中心](https://luckycola.com.cn/)
2. 登录后进入"用户中心"页面，获取APPKey和用户ID(uid)
3. 确保账号已相关API权限及额度

## 使用方法

### 直接运行

```bash
node build/index.js
```

### 作为MCP服务器

在MCP客户端（如Claude Desktop、Cursor等）中配置此服务：

**npx方式使用**
```json
{
  "mcpServers": {
    "luckycola-mcp": {
      "command": "npx",
      "args": ["-y", "luckycola-mcp"],
      "env": {
        "LUCKYCOLA_OPEN_KEY": "你的APPKey",
        "LUCKYCOLA_OPEN_UID": "你的UID",
        "MCP_FILE_PATH": "希望进行文件/图片操作的目录路径"
      }
    }
  }
}
```

或

**下载到本地使用**
```json
{
  "mcpServers": {
    "luckycola-mcp": {
      "command": "node",
      "args": ["/path/to/luckycola-mcp/build/index.js"],
      "env": {
        "LUCKYCOLA_OPEN_KEY": "你的APPKey",
        "LUCKYCOLA_OPEN_UID": "你的UID",
        "MCP_FILE_PATH": "希望进行文件/图片操作的目录路径"
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

## 文件操作工具（fileOperation）

**重要说明:** 使用文件操作工具前，建议先对AI说"请对MCP_FILE_PATH目录下的文件接下的任务"，以确保AI明确操作目录。

fileOperation工具支持对MCP_FILE_PATH目录下的文件进行多种操作，包括：删除、重命名、读取、写入、列出文件、JSON与Excel互转、图片压缩、图片OCR识别等。每种操作均有对应参数和典型场景，详见下表和案例。

### 操作类型与参数说明

| 操作类型(operation)      | 说明                         | 主要参数                | 典型场景与提示词示例 |
|--------------------------|------------------------------|-------------------------|----------------------|
| delete                   | 删除指定文件                 | filename                | 删除test.txt文件：<br>"请删除test.txt文件"|
| rename                   | 重命名文件                   | filename, newFilename   | 文件重命名：<br>"请把a.docx重命名为b.docx"|
| read                     | 读取文件内容（支持docx纯文本）| filename                | 读取内容：<br>"请读取test.txt的内容"<br>"请读取word文档a.docx内容"|
| write                    | 写入/追加内容到文件（支持docx）| filename, content, mode | 覆盖写入：<br>"请将'你好世界'写入test.txt"<br>追加写入：<br>"请在test.txt追加'再见'"|
| list                     | 列出目录下文件（可只列文件）  | onlyFiles               | 查看文件列表：<br>"请列出目录下所有文件"<br>"只列出普通文件"|
| json2xlsx                | JSON转Excel（.xlsx）         | filename, content       | "请将以下JSON内容保存为excel文件data.xlsx：{...}"|
| xlsx2json                | Excel转JSON                  | filename, newFilename   | "请将data.xlsx转换为JSON文件"|
| compressImage            | 图片压缩（支持jpg/png/gif）  | filename, quality, output| "请压缩图片a.png，质量80，输出为a_compressed.png"|
| ocrToImageBase64         | 图片OCR识别（jpg/png，≤2M）  | filename                | "请识别图片a.jpg中的文字"|

#### 详细参数说明
- `filename`：要操作的文件名（相对于MCP_FILE_PATH）
- `newFilename`：新文件名（重命名/转换时用）
- `content`：写入内容或json2xlsx的JSON字符串
- `mode`：写入模式，`append`为追加，`overwrite`为覆盖，默认覆盖
- `onlyFiles`：list操作时是否只列普通文件，默认false
- `quality`：图片压缩质量，1-100，默认80
- `output`：压缩后输出文件名，默认在原文件名后加_compressed

### 使用案例与推荐提示词

#### 1. 删除文件
```
请删除test.txt文件
```

#### 2. 重命名文件
```
请把a.docx重命名为b.docx
```

#### 3. 读取文件内容
```
请读取test.txt的内容
请读取word文档a.docx内容
```

#### 4. 写入/追加内容到文件
```
请将"你好世界"写入test.txt
请在test.txt追加"再见"
```

#### 5. 列出目录下文件
```
请列出目录下所有文件
只列出普通文件
```

#### 6. JSON转Excel
```
请将以下JSON内容保存为excel文件data.xlsx：[{"姓名":"张三","年龄":18},{"姓名":"李四","年龄":20}]
```

#### 7. Excel转JSON
```
请将data.xlsx转换为JSON文件
```

#### 8. 图片压缩
```
请压缩图片a.png，质量80，输出为a_compressed.png
```

#### 9. 图片OCR识别
```
请识别图片a.jpg中的文字
```

> **注意事项：**
> - 文件操作均在MCP_FILE_PATH指定目录下进行，确保有读写权限。
> - 图片OCR仅支持jpg/png格式且文件≤2M。
> - 图片压缩支持jpg/png/gif，gif为动图时会自动处理色彩数。
> - Excel/Word操作请确保文件扩展名正确（.xlsx/.docx）。
> - 若遇权限错误，请参考下方"故障排除"章节。

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