import { apis } from "../api/index.js";
export async function checkImageSafety(imageUrl, openKey, openUid) {
    // 请求体参数
    const bodyParams = {
        imgUrl: imageUrl,
        appKey: openKey,
        uid: openUid,
    };
    const formattedBody = JSON.stringify(bodyParams);
    try {
        const response = await fetch(apis.checkImageSafety.url, {
            method: apis.checkImageSafety.method,
            headers: {
                'Content-Type': 'application/json', // 设置请求体的类型为 application/json
            },
            body: formattedBody
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.data)
            return {
                ...result.data,
                code: result.code,
                msg: result.msg,
            };
        return null;
    }
    catch (error) {
        console.error("调用内容安全检测API时出错:", error);
        return null;
    }
}
// 查询采谱
export async function getFoodMenu(foodTitle, openKey, openUid) {
    // 请求体参数
    const bodyParams = {
        foodTitle,
        appKey: openKey,
        uid: openUid,
    };
    const formattedBody = JSON.stringify(bodyParams);
    try {
        const response = await fetch(apis.getFoodMenu.url, {
            method: apis.getFoodMenu.method,
            headers: {
                'Content-Type': 'application/json', // 设置请求体的类型为 application/json
            },
            body: formattedBody
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.data)
            return {
                ...result.data,
                code: result.code,
                msg: result.msg,
            };
        return null;
    }
    catch (error) {
        console.error("调用getFoodMenu API时出错:", error);
        return null;
    }
}
// 图片ocr识别
export async function imageOCRFn(imgBase64, openKey, openUid) {
    // 请求体参数
    const bodyParams = {
        imgBase64,
        appKey: openKey,
        uid: openUid,
    };
    const formattedBody = JSON.stringify(bodyParams);
    try {
        const response = await fetch(apis.imageOcr.url, {
            method: apis.imageOcr.method,
            headers: {
                'Content-Type': 'application/json', // 设置请求体的类型为 application/json
            },
            body: formattedBody
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.data)
            return {
                ...result.data,
                code: result.code,
                msg: result.msg,
            };
        return null;
    }
    catch (error) {
        console.error("调用imageOcr API时出错:", error);
        return null;
    }
}
