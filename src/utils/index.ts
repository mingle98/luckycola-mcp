import crypto from "node:crypto";
import mammoth from "mammoth";
import * as fs from "fs";
import { Document, Packer, Paragraph } from "docx";

// 格式化查询参数
export function formatQuery(parameters: Record<string, string>): string {
  const sortedKeys = Object.keys(parameters).sort();
  return sortedKeys.map(key => `${key}=${parameters[key]}`).join('&');
}


export const readDocxText = async (filePath: string) => {
  try {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
  } catch (error) {
    console.error(error);
    return '';
  }
}


export const writeDocxText = async (filePath: string, content: string) => {
  try {
    let paras: string[] = [];
    try { const arr = JSON.parse(content); if (Array.isArray(arr)) paras = arr.map(String); else paras = [content]; } catch { paras = [content]; }
    const doc = new Document({
      sections: [
        { properties: {}, children: paras.map(t => new Paragraph(t)) }
      ]
    });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
  } catch (error) {
    console.error(error);
  }
}

// 权限错误提示
export const permissionError = (err: any, path: any) => {
   return `读取目录失败：权限不足（${err.code}）。\n` +
        `请尝试为目标目录开启读权限。\n\n` +
        `【macOS权限开启指引】\n` +
        `1. 打开终端\n` +
        `2. 进入目标目录：cd ${path}\n` +
        `3. 授权当前用户读权限：\n   chmod u+r .\n` +
        `4. 如有需要可更改所有者：\n   sudo chown $USER:$USER .\n` +
        `5. 若在Finder中操作，右键目录-显示简介-在\"共享与权限\"中设置为\"读与写\"\n\n` +
        `如仍有问题，请确保你有该目录的操作权限，或联系系统管理员。`;
}