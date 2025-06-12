#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkImageSafety, getFoodMenu } from "./services/service.js";
// 环境变量配置
const LUCKYCOLA_OPEN_KEY = process.env.LUCKYCOLA_OPEN_KEY;
const LUCKYCOLA_OPEN_UID = process.env.LUCKYCOLA_OPEN_UID;
const FILE_PATH = process.env.FILE_PATH;
if (!LUCKYCOLA_OPEN_KEY || !LUCKYCOLA_OPEN_UID) {
    console.error("警告：未设置环境变量 LUCKYCOLA_OPEN_KEY 和 LUCKYCOLA_OPEN_UID");
    console.error("服务将启动但无法调用API功能，仅供测试使用");
}
if (!FILE_PATH) {
    console.error("警告：未设置环境变量 FILE_PATH");
    console.error("服务将启动但无法使用文件处理功能，仅供测试使用");
}
// 创建MCP服务器实例
const server = new McpServer({
    name: "luckycola_open_mcp",
    version: "1.0.0",
});
// 注册图片合规检测工具
server.tool("checkImage", "检查在线图片内容是否合规", {
    imgUrl: z.string().describe("需要检查的图片URL")
}, async ({ imgUrl }) => {
    // 检查API密钥是否配置
    if (!LUCKYCOLA_OPEN_KEY || !LUCKYCOLA_OPEN_UID) {
        return {
            content: [
                {
                    type: "text",
                    text: "错误：未设置环境变量 LUCKYCOLA_OPEN_KEY 和 LUCKYCOLA_OPEN_UID，无法调用API。"
                }
            ]
        };
    }
    const safetyResult = await checkImageSafety(imgUrl, LUCKYCOLA_OPEN_KEY, LUCKYCOLA_OPEN_UID);
    if (!safetyResult) {
        return {
            content: [
                {
                    type: "text",
                    text: "图片合规检测失败，请检查网络连接和API密钥配置。"
                }
            ]
        };
    }
    const { tips, Results, code, msg } = safetyResult;
    if (code == -5 || code == -6) {
        // 额度不足
        return {
            content: [
                {
                    type: "text",
                    text: "图片合规检测失败，API额度不足，请前往【个人中心-充值中心】获取更多额度。"
                }
            ]
        };
    }
    ;
    if (code != 0) {
        return {
            content: [
                {
                    type: "text",
                    text: `图片合规检测失败，错误码：${code}，错误信息：${msg}`
                }
            ]
        };
    }
    ;
    let SubResultsDetail = Results && Results[0] && Results[0].SubResults && Results[0].SubResults[0] || {};
    let Suggestion = SubResultsDetail.Suggestion || "";
    let safe = Suggestion == "pass" ? "合规" : Suggestion == "review" ? "人工审核" : "不合规";
    let safetyScore = SubResultsDetail.Rate || 0;
    return {
        content: [
            {
                type: "text",
                text: `图片合规检测结果：\n\n` +
                    `提示: ${tips}\n` +
                    `安全状态: ${safe}\n` +
                    `安全分数: ${safetyScore.toFixed(2)}%\n` +
                    `检测详情: ${JSON.stringify(SubResultsDetail, null, 2)}`
            }
        ]
    };
});
// 获取菜谱工具
server.tool("getFoodMenu", "获取菜品的菜谱(制作方法)", {
    foodTitle: z.string().describe("需要查询的菜品名称")
}, async ({ foodTitle }) => {
    // 检查API密钥是否配置
    if (!LUCKYCOLA_OPEN_KEY || !LUCKYCOLA_OPEN_UID) {
        return {
            content: [
                {
                    type: "text",
                    text: "错误：未设置环境变量 LUCKYCOLA_OPEN_KEY 和 LUCKYCOLA_OPEN_UID，无法调用API。"
                }
            ]
        };
    }
    const menuResult = await getFoodMenu(foodTitle, LUCKYCOLA_OPEN_KEY, LUCKYCOLA_OPEN_UID);
    if (!menuResult) {
        return {
            content: [
                {
                    type: "text",
                    text: "菜谱获取失败，请检查网络连接和API密钥配置。"
                }
            ]
        };
    }
    const { foodMenu = [], code, msg } = menuResult;
    if (code == -5 || code == -6) {
        // 额度不足
        return {
            content: [
                {
                    type: "text",
                    text: "菜谱获取失败，API额度不足，请前往【个人中心-充值中心】获取更多额度。"
                }
            ]
        };
    }
    ;
    if (code != 0) {
        return {
            content: [
                {
                    type: "text",
                    text: `菜谱获取失败，错误码：${code}，错误信息：${msg}`
                }
            ]
        };
    }
    ;
    let randomIndex = Math.floor(Math.random() * foodMenu.length);
    return {
        content: [
            {
                type: "text",
                text: `${foodTitle}的菜谱结果如下：\n\n` +
                    `${JSON.stringify(foodMenu[randomIndex], null, 2)}`
            }
        ]
    };
});
// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("LuckyCola Open MCP服务已启动");
}
main().catch((error) => {
    console.error("启动服务时发生错误:", error);
    process.exit(1);
});
