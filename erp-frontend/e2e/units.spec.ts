import { expect, test, type Page } from "@playwright/test";
import { adminApi, uid } from "./helpers";

/** فرم را ذخیره می‌کند و شناسه برگشتی از API را برمی‌گرداند */
async function saveUnit(page: Page, button: string): Promise<number> {
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" && /\/BaseInfo\/Units$/.test(r.url()),
  );
  await page.getByRole("button", { name: button }).click();
  const res = await response;
  expect(res.status(), await res.text()).toBeLessThan(300);
  return (await res.json()).id;
}

test.describe("واحد سنجش", () => {
  test("فرم خالی خطای اعتبارسنجی نشان می‌دهد و چیزی ثبت نمی‌کند", async ({
    page,
  }) => {
    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && /\/BaseInfo\/Units$/.test(r.url()))
        posted = true;
    });
    await page.goto("/base-info/units/create");
    await page.getByRole("button", { name: "ثبت واحد" }).click();
    await expect(page.getByText("عنوان الزامی است")).toBeVisible();
    await expect(page.getByText("نماد الزامی است")).toBeVisible();
    expect(posted).toBe(false);
  });

  test("واحد اصلی و فرعی با ضریب تبدیل و دقت اعشار درست در دیتابیس ذخیره می‌شوند", async ({
    page,
  }) => {
    const api = await adminApi();
    const tag = uid();

    await page.goto("/base-info/units/create");
    await page.getByLabel("عنوان واحد").fill(`عدد ${tag}`);
    await page.getByLabel("نماد").fill(`p${tag}`.slice(0, 10));
    const baseId = await saveUnit(page, "ثبت واحد");

    await page.goto("/base-info/units/create");
    await page.getByLabel("عنوان واحد").fill(`کارتن ${tag}`);
    await page.getByLabel("نماد").fill(`c${tag}`.slice(0, 10));
    await page.getByLabel("تعداد رقم اعشار").fill("2");
    await page.getByLabel("واحد پایه").click();
    await page.getByRole("option", { name: new RegExp(`عدد ${tag}`) }).click();
    await page.getByLabel("ضریب تبدیل").fill("12");
    // راهنمای زیر فیلد، رابطه دو واحد را نشان می‌دهد
    await expect(
      page.getByText(`۱ کارتن ${tag} = 12 عدد ${tag}`),
    ).toBeVisible();
    const subId = await saveUnit(page, "ثبت واحد");

    // قبلاً ضریب واحد فرعی همیشه ۱ ذخیره می‌شد
    const sub = await (await api.get(`/api/BaseInfo/Units/${subId}`)).json();
    expect(sub).toMatchObject({
      baseUnitId: baseId,
      conversionFactor: 12,
      precision: 2,
    });

    // ویرایش: دقت اعشار نباید با ذخیره دوباره صفر شود
    await page.goto(`/base-info/units/edit/${subId}`);
    await expect(page.getByLabel("تعداد رقم اعشار")).toHaveValue("2");
    await page.getByLabel("ضریب تبدیل").fill("24");
    const put = page.waitForResponse(
      (r) =>
        r.request().method() === "PUT" &&
        r.url().includes(`/BaseInfo/Units/${subId}`),
    );
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    expect((await put).status()).toBeLessThan(300);

    const edited = await (await api.get(`/api/BaseInfo/Units/${subId}`)).json();
    expect(edited).toMatchObject({ conversionFactor: 24, precision: 2 });
    await api.dispose();
  });

  test("تغییرات ذخیره‌نشده هنگام انصراف هشدار می‌دهد", async ({ page }) => {
    await page.goto("/base-info/units/create");
    await page.getByLabel("عنوان واحد").fill("موقت");
    await expect(page.getByText("ذخیره نشده")).toBeVisible();
    await page.getByRole("button", { name: "انصراف" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("تغییرات ذخیره نشده است");
    await dialog.getByRole("button", { name: "ماندن در فرم" }).click();
    await expect(page.getByLabel("عنوان واحد")).toHaveValue("موقت");
  });
});
