import { expect, test } from "@playwright/test";
import { adminApi, createProduct, createUnit, ok, uid, waitForSave } from "./helpers";

const ATTRIBUTES = "/api/BaseInfo/ProductAttributes";

test.describe("ویژگی و تنوع کالا", () => {
  test("ویژگی با مقادیرش از فرم ثبت می‌شود و از ترکیب ویژگی‌ها کالای تنوع ساخته می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();

    // ویژگی رنگ از فرم با دو مقدار
    await page.goto("/base-info/product-attributes/create");
    await page.getByRole("textbox", { name: "کد", exact: true }).fill(`C${tag}`);
    await page.getByRole("textbox", { name: "عنوان", exact: true }).fill(`رنگ ${tag}`);
    await page.getByLabel("کد مقدار ردیف 1").fill("R");
    await page.getByLabel("عنوان مقدار ردیف 1").fill("قرمز");
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await page.getByLabel("کد مقدار ردیف 2").fill("B");
    await page.getByLabel("عنوان مقدار ردیف 2").fill("آبی");
    const saved = waitForSave(page, "POST", /\/BaseInfo\/ProductAttributes$/);
    await page.getByRole("button", { name: "ثبت ویژگی" }).click();
    const colorId = (await (await saved).json()).id;
    const color = await (await api.get(`${ATTRIBUTES}/${colorId}`)).json();
    expect(color.values.map((v: { title: string }) => v.title)).toEqual(["قرمز", "آبی"]);

    await ok(
      await api.post(ATTRIBUTES, {
        data: {
          code: `S${tag}`,
          title: `سایز ${tag}`,
          values: [
            { code: "S", title: "کوچک" },
            { code: "L", title: "بزرگ" },
          ],
        },
      }),
      "ویژگی سایز",
    );

    const unitId = await createUnit(api, `عدد ${tag}`);
    const productId = await createProduct(api, { code: `VAR-${tag}`, name: `پیراهن ${tag}`, unitId });

    // ساخت تنوع از تب تنوع‌های کالا
    await page.goto(`/base-info/products/edit/${productId}`);
    await page.getByRole("tab", { name: "تنوع‌ها" }).click();
    await page.getByRole("button", { name: "ساخت تنوع" }).click();
    const colorGroup = page.getByRole("group", { name: `رنگ ${tag}` });
    await colorGroup.getByLabel("قرمز").check();
    await colorGroup.getByLabel("آبی").check();
    await page.getByRole("group", { name: `سایز ${tag}` }).getByLabel("کوچک").check();
    await expect(page.getByText("2 ترکیب")).toBeVisible();
    await page.getByRole("button", { name: "ساخت تنوع‌ها" }).click();
    await expect(page.getByText("2 تنوع ساخته شد")).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: `VAR-${tag}-R-S` });
    await expect(row).toContainText(`پیراهن ${tag} قرمز کوچک`);
    await expect(row).toContainText(`سایز ${tag}: کوچک`);
    await expect(page.getByRole("row").filter({ hasText: `VAR-${tag}-B-S` })).toBeVisible();

    // تنوع کالای کامل است و به کالای مادر اشاره می‌کند
    const variants = await (await api.get(`/api/BaseInfo/Products/${productId}/variants`)).json();
    const red = variants.find((v: { code: string }) => v.code === `VAR-${tag}-R-S`);
    const redProduct = await (await api.get(`/api/BaseInfo/Products/${red.id}`)).json();
    expect(redProduct).toMatchObject({ unitId, variantParentId: productId, variantParentName: `پیراهن ${tag}` });

    // ترکیب تکراری دوباره ساخته نمی‌شود و ویژگی‌ها باید همان ویژگی‌های تنوع‌های قبلی باشد
    const sizeSmall = (await (await api.get(`${ATTRIBUTES}/lookup`)).json())
      .find((a: { code: string }) => a.code === `S${tag}`)
      .values.find((v: { code: string }) => v.code === "S").id;
    const generate = (attributeValueIds: number[]) =>
      api.post(`/api/BaseInfo/Products/${productId}/variants`, { data: { productId, attributeValueIds } });
    expect(await (await generate([color.values[0].id, sizeSmall])).json()).toEqual({ created: 0 });
    expect((await generate([color.values[0].id])).status()).toBe(422);

    // مقدار و کالای مادرِ در حال استفاده حذف نمی‌شوند
    const removeRed = await api.put(`${ATTRIBUTES}/${colorId}`, {
      data: {
        id: colorId,
        code: `C${tag}`,
        title: `رنگ ${tag}`,
        isActive: true,
        values: [{ id: color.values[1].id, code: "B", title: "آبی" }],
        rowVersion: color.rowVersion,
      },
    });
    expect(removeRed.status()).toBe(422);
    expect(await removeRed.text()).toContain("قرمز");
    expect((await api.delete(`/api/BaseInfo/Products/${productId}`)).status()).toBe(422);

    await api.dispose();
  });
});
