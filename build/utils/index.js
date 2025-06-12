// 格式化查询参数
export function formatQuery(parameters) {
    const sortedKeys = Object.keys(parameters).sort();
    return sortedKeys.map(key => `${key}=${parameters[key]}`).join('&');
}
