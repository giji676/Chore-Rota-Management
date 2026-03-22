const getErrorMessage = (err) => {
    if (!err.response) return "Network error. Please try again.";

    const data = err.response.data;

    if (typeof data === "string") return data;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    if (typeof data === "object") {
        return Object.values(data).flat().join("\n");
    }

    return "Something went wrong. Please try again.";
}

export default getErrorMessage;
