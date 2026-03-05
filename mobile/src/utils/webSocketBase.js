const apiUrl = process.env.EXPO_PUBLIC_URL;

// convert http -> ws automatically
const wsBase = apiUrl
  .replace(/^http/, "ws")
  .replace(/\/$/, ""); // remove trailing slash

const socketUrl = (path) => {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${wsBase}${path}`;
};

export default socketUrl;
