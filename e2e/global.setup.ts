import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userInfoPath = path.join(__dirname, ".auth/user-info.json");

// Setup must be run serially, this is necessary if Playwright is configured to run fully parallel: https://playwright.dev/docs/test-parallel
setup.describe.configure({ mode: "serial" });

setup("global setup", async ({ page, context }) => {
  try {
    // 设置 Clerk
    await clerkSetup();
    await setupClerkTestingToken({ context });

    // 执行登录
    await page.goto("/sign-in");
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        password: process.env.TEST_USER_PASSWORD ?? "",
        identifier: process.env.TEST_USER_NAME ?? "",
      },
    });

    // 获取用户 ID
    await clerk.loaded({ page });
    const userId = await page.evaluate(() => {
      const w = window as { Clerk?: { user?: { id: string } } };
      return w.Clerk?.user?.id;
    });

    if (!userId) {
      throw new Error("未能获取用户ID");
    }

    // 保存用户信息
    fs.writeFileSync(userInfoPath, JSON.stringify({ userId }));

    // 保存登录状态到文件
    await context.storageState({
      path: path.join(__dirname, ".auth/state.json"),
    });
  } catch (error) {
    console.error("Clerk setup failed:", error);
    throw error;
  }
});
