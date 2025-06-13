#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkImageSafety, getFoodMenu, imageOCRFn } from "./services/service.js";
import type { CheckImageParams, GetFoodMenuParams } from "./types/index.js";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { execFile } from "child_process";
import xlsx from "xlsx";
import { Document, Packer, Paragraph } from "docx";
import sharp from "sharp";
// @ts-ignore
import gifsicle from "gifsicle";
import { readDocxText, writeDocxText, permissionError } from "./utils/index.js";

// 环境变量配置
const LUCKYCOLA_OPEN_KEY = process.env.LUCKYCOLA_OPEN_KEY;
const LUCKYCOLA_OPEN_UID = process.env.LUCKYCOLA_OPEN_UID;
const FILE_PATH = process.env.MCP_FILE_PATH;

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
server.tool(
  "checkImage",
  "检查在线图片内容是否合规",
  {
    imgUrl: z.string().describe("需要检查的图片URL")
  },
  async ({ imgUrl }: CheckImageParams) => {
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
    if (code != 0) {
      return {
        content: [
          {
            type: "text",
            text: `图片合规检测失败，错误码：${code}，错误信息：${msg}`
          }
        ]
      }
    };
    let SubResultsDetail = Results && Results[0] &&  Results[0].SubResults &&  Results[0].SubResults[0] || {};
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
  }
);


// 获取菜谱工具
server.tool(
  "getFoodMenu",
  "获取菜品的菜谱(制作方法)",
  {
    foodTitle: z.string().describe("需要查询的菜品名称")
  },
  async ({ foodTitle }: GetFoodMenuParams) => {
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
    if (code != 0) {
      return {
        content: [
          {
            type: "text",
            text: `菜谱获取失败，错误码：${code}，错误信息：${msg}`
          }
        ]
      }
    };
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
  }
);

// 注册文件操作工具
server.tool(
  "fileOperation",
  "对FILE_PATH目录下的文件进行删除、重命名、读取和写入操作，以及图片压缩",
  {
    operation: z.enum(["delete", "rename", "read", "write", "list", "json2xlsx", "xlsx2json", "compressImage", "ocrToImageBase64"]).describe("操作类型：delete/read/rename/write/list/json2xlsx/xlsx2json/compressImage/ocrToImageBase64"),
    filename: z.string().describe("要操作的文件名（相对于FILE_PATH),当为json2xlsx任务时为.xlsx的文件名"),
    newFilename: z.string().optional().describe("新文件名,注意word文件以.docx结尾,excel文件以.xlsx结尾"),
    content: z.string().optional().describe("写入内容，仅在write时需要"),
    mode: z.enum(["append", "overwrite"]).optional().describe("写入模式，append为追加，overwrite为覆盖，默认覆盖"),
    onlyFiles: z.boolean().optional().describe("list操作时是否只列普通文件，默认false"),
    quality: z.number().min(1).max(100).optional().describe("图片压缩质量，1-100，默认80"),
    output: z.string().optional().describe("压缩后输出文件名，默认在原文件名后加_compressed")
  },
  async ({ operation, filename, newFilename, content, mode = "overwrite", onlyFiles = false, quality, output }) => {
    if (!FILE_PATH) {
      return {
        content: [
          { type: "text", text: "错误：未设置环境变量 FILE_PATH，无法进行文件操作。" }
        ]
      };
    }
    const filePath = path.resolve(FILE_PATH, filename || "");
    try {
      switch (operation) {
        case "delete": {
          if (!fs.existsSync(filePath)) {
            return { content: [{ type: "text", text: `文件 ${filename} 不存在。` }] };
          }
          fs.unlinkSync(filePath);
          return { content: [{ type: "text", text: `文件 ${filename} 已删除。` }] };
        }
        case "rename": {
          if (!newFilename) {
            return { content: [{ type: "text", text: "重命名操作需要提供文件的新名称。" }] };
          }
          if (!fs.existsSync(filePath)) {
            return { content: [{ type: "text", text: `文件 ${filename} 不存在。` }] };
          }
          const newFilePath = path.resolve(FILE_PATH, newFilename);
          fs.renameSync(filePath, newFilePath);
          return { content: [{ type: "text", text: `文件 ${filename} 已重命名为 ${newFilename}。` }] };
        }
        case "read": {
          if (!fs.existsSync(filePath)) {
            return { content: [{ type: "text", text: `文件 ${filename} 不存在。` }] };
          }
          if (/\.docx$/i.test(filename)) {
            // 读取docx为纯文本，分段落
            try {
              let text = await readDocxText(filePath);
              return { content: [{ type: "text", text: `${filename}文件内容：\n${text}` }] };
            } catch (e: any) {
              return { content: [{ type: "text", text: `docx文件读取失败：${e.message}` }] };
            }
          } else {
            const data = fs.readFileSync(filePath, "utf-8");
            return { content: [{ type: "text", text: `${filename}文件内容：\n${data}` }] };
          }
        }
        case "write": {
          if (typeof content !== "string") {
            return { content: [{ type: "text", text: "写入操作需要提供需要写入的内容。" }] };
          }
          if (/\.docx$/i.test(filename)) {
            // 写入docx为多段落
            try {
              let willText = content;
              if (mode === "append") {
                let text = await readDocxText(filePath);
                willText = text + '' + content;
              }
              await writeDocxText(filePath, willText);
              return { content: [{ type: "text", text: `内容已${mode === "append" ? "追加到" : "写入到"}docx文件 ${filename}。` }] };
            } catch (e: any) {
              return { content: [{ type: "text", text: `docx文件写入失败：${e.message}` }] };
            }
          } else {
            if (mode === "append") fs.appendFileSync(filePath, content, "utf-8");
            else fs.writeFileSync(filePath, content, "utf-8");
            return { content: [{ type: "text", text: `内容已${mode === "append" ? "追加到" : "写入到"}文件 ${filename}。` }] };
          }
        }
        case "list": {
          try {
            let files = fs.readdirSync(path.resolve(FILE_PATH));
            if (onlyFiles) files = files.filter(f => {
              try { return fs.statSync(path.resolve(FILE_PATH, f)).isFile() && !f.startsWith('.'); } catch { return false; }
            });
            // 展示文件名和文件尺寸
            const fileInfos = files.map(f => {
              try {
                const stat = fs.statSync(path.resolve(FILE_PATH, f));
                if (stat.isFile()) {
                  const sizeKB = (stat.size / 1024).toFixed(2);
                  return `${f} (${sizeKB}KB)`;
                } else {
                  return `${f} (DIR)`;
                }
              } catch {
                return `${f} (未知)`;
              }
            });
            return { content: [{ type: "text", text: `目录下文件：\n${fileInfos.join("\n")}` }] };
          } catch (err: any) {
            if (err.code === 'EACCES' || err.code === 'EPERM') {
               return {
                  content: [{
                    type: "text",
                    text: permissionError(err, FILE_PATH)
                  }]
                };
            }
            return { content: [{ type: "text", text: `读取目录失败：${err.message}` }] };
          }
        }
        case "json2xlsx": {
          if (typeof content !== "string") {
            return { content: [{ type: "text", text: "json2xlsx操作需要提供json字符串内容。" }] };
          }
          let jsonData;
          try {
            jsonData = JSON.parse(content);
          } catch (e) {
            return { content: [{ type: "text", text: "提供的内容不是有效的JSON字符串。" }] };
          }
          try {
            const ws = xlsx.utils.json_to_sheet(jsonData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
            xlsx.writeFile(wb, filePath);
            return { content: [{ type: "text", text: `已将JSON数据保存为xlsx文件：${filename}` }] };
          } catch (e: any) {
            return { content: [{ type: "text", text: `保存为xlsx文件失败：${e.message}` }] };
          }
        }
        case "xlsx2json": {
          if (!fs.existsSync(filePath)) {
            return { content: [{ type: "text", text: `文件 ${filename} 不存在。` }] };
          }
          try {
            const wb = xlsx.readFile(filePath);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = xlsx.utils.sheet_to_json(ws, { defval: null });
            const jsonFile = filePath.replace(/\.xlsx?$/, ".json");
            let mynewFilePath = '';
            if (newFilename) {
              mynewFilePath = path.resolve(FILE_PATH, newFilename);
            }
            let targetPath = mynewFilePath || jsonFile;
            fs.writeFileSync(targetPath, JSON.stringify(jsonData, null, 2), "utf-8");
            return { content: [{ type: "text", text: `已将${filename}内容保存为JSON文件：${path.basename(jsonFile)}` }] };
          } catch (e: any) {
            return { content: [{ type: "text", text: `读取xlsx或保存json失败：${e.message}` }] };
          }
        }
        case "compressImage": {
          if (!fs.existsSync(filePath)) {
            return { content: [{ type: "text", text: `图片文件 ${filename} 不存在。` }] };
          }
          const ext = path.extname(filename).toLowerCase();
          if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            return { content: [{ type: "text", text: `仅支持jpg、jpeg、png、gif格式图片压缩。` }] };
          }
          if (ext === '.gif') {
            // gif动图压缩
            const q = typeof quality === 'number' ? quality : 80;
            const outFile = output ? path.resolve(FILE_PATH, output) : filePath.replace(/(\.[^.]+)$/, '_compressed$1');
            try {
              const colors = Math.max(2, Math.round(q / 100 * 256));
              await new Promise((resolve, reject) => {
                execFile(gifsicle, ['-O3', `--colors`, String(colors), '-o', outFile, filePath], (err: any) => {
                  if (err) reject(err); else resolve(true);
                });
              });
              return { content: [{ type: "text", text: `GIF图片已压缩并保存为：${path.basename(outFile)}` }] };
            } catch (e: any) {
              return { content: [{ type: "text", text: `GIF图片压缩失败：${e.message}` }] };
            }
          }
          // 其他格式仍用sharp
          const q = typeof quality === 'number' ? quality : 80;
          const outFile = output ? path.resolve(FILE_PATH, output) : filePath.replace(/(\.[^.]+)$/, '_compressed$1');
          try {
            let img = sharp(filePath);
            if (ext === '.png') {
              img = img.png({ quality: q });
            } else {
              img = img.jpeg({ quality: q });
            }
            await img.toFile(outFile);
            return { content: [{ type: "text", text: `图片已压缩并保存为：${path.basename(outFile)}` }] };
          } catch (e: any) {
            return { content: [{ type: "text", text: `图片压缩失败：${e.message}` }] };
          }
        }
        case "ocrToImageBase64": {
          if (!LUCKYCOLA_OPEN_KEY || !LUCKYCOLA_OPEN_UID) {
            return { content: [{ type: "text", text: "未配置LUCKYCOLA_OPEN_KEY或LUCKYCOLA_OPEN_UID。" }] };
          }
          if (!fs.existsSync(filePath)) {
            return { content: [{ type: "text", text: `图片文件 ${filename} 不存在。` }] };
          }
          const stat = fs.statSync(filePath);
          if (stat.size > 2 * 1024 * 1024) {
            return { content: [{ type: "text", text: `图片文件过大，不能超过2M。` }] };
          }
          const ext = path.extname(filename).toLowerCase();
          if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
            return { content: [{ type: "text", text: `仅支持jpg、jpeg、png格式图片。` }] };
          }
          try {
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');
            let mime = '';
            if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
            else if (ext === '.png') mime = 'image/png';
            const dataUrl = `data:${mime};base64,${base64}`;
            let imageOCRRes: any = await imageOCRFn(dataUrl, LUCKYCOLA_OPEN_KEY, LUCKYCOLA_OPEN_UID) || {};
            const { code, msg } = imageOCRRes;
            if (code != 0 || !imageOCRRes.content) {
              return { content: [{ type: "text", text: `图片内容提取失败：${msg || "未知错误"}` }] };
            };
            return { content: [{ type: "text", text: `${filename}图片内容提取成功：\n ${imageOCRRes.content}` }] };
          } catch (e: any) {
            return { content: [{ type: "text", text: `${filename}图片内容提取失败：${e.message}` }] };
          }
        }
        default:
          return { content: [{ type: "text", text: "未知操作类型。" }] };
      }
    } catch (err: any) {
      // 权限相关错误处理
      if (err.code === 'EACCES' || err.code === 'EPERM') {
         return {
          content: [{
            type: "text",
            text: permissionError(err, FILE_PATH)
          }]
        };
      }
      return { content: [{ type: "text", text: `文件操作失败：${err.message}` }] };
    }
  }
);

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
