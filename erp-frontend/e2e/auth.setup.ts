import { test as setup } from "@playwright/test";
import fs from "node:fs";
import { AUTH_FILE, loginToken } from "./helpers";

// یک بار ورود از راه API و ذخیره توکن، تا بقیه تست‌ها مستقیم وارد برنامه شوند
setup("ورود admin", async ({ baseURL }) => {
  const token = await loginToken();
  fs.mkdirSync("e2e/.auth", { recursive: true });
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify({ cookies: [], origins: [{ origin: new URL(baseURL!).origin, localStorage: [{ name: "accessToken", value: token }] }] }),
  );
});
