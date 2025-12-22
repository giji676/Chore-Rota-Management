export function jsonLog(str, data) {
    if (data === undefined) {
        console.log(JSON.stringify(str, null, 2));
    } else {
        console.log(`${str}: ${JSON.stringify(data, null, 2)}`);
    }
}

export function apiLogSuccess(response) {
    jsonLog("✅ Success:", response.data);
}

export function apiLogError(error) {
    if (error.response) {
        console.log("❌ Status:", error.response.status);
        console.log("❌ Error data:", error.response.data);
    } else {
        console.log("❌ Error message:", error.message);
    }
}
