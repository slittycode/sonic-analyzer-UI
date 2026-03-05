import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const backendBaseUrl = process.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function backendIsReachable(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 2_500);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/openapi.json`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

test("live backend phase1 renders results without connectivity errors", async ({ page }) => {
  test.skip(!(await backendIsReachable(backendBaseUrl)), `Backend not reachable at ${backendBaseUrl}`);

  await page.goto("/", { waitUntil: "networkidle" });

  const fixturePath = path.resolve(testDir, "./fixtures/silence.wav");
  await page.setInputFiles("#audio-upload", fixturePath);

  const analyzeButton = page.getByRole("button", { name: /Initiate Analysis/i });
  await expect(analyzeButton).toBeVisible();

  const requestStartedAt = Date.now();
  const analyzeResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/analyze") && response.request().method() === "POST",
    { timeout: 35_000 },
  );

  await analyzeButton.click();

  const analyzeResponse = await analyzeResponsePromise;
  const responseLatencyMs = Date.now() - requestStartedAt;
  expect(analyzeResponse.ok()).toBeTruthy();
  expect(responseLatencyMs).toBeLessThan(30_000);

  await expect(page.getByText("Analysis Results")).toBeVisible({ timeout: 35_000 });
  await expect(page.getByText("System Diagnostics")).toBeVisible();
  await expect(page.getByText(/Cannot reach DSP backend/i)).toHaveCount(0);
});
