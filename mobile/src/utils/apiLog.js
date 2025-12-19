export function apiLogSuccess(response) {
    console.log("✅ Success:", response.data);
}

export function apiLogError(error) {
    if (error.response) {
        console.log("❌ Status:", error.response.status);
        console.log("❌ Error data:", error.response.data);
    } else {
        console.log("❌ Error message:", error.message);
    }
}
