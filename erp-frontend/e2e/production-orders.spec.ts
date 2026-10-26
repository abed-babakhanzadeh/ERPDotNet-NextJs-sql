import { expect, test } from "@playwright/test";
import { adminApi, createBom, createProduct, createUnit, pickProduct, uid, waitForSave } from "./helpers";

const ORDERS = "/api/Production/Orders";

test.describe("سفارش تولید", () => {
  test("سفارش از فرم با فرمول پیش‌فرض و نیاز مواد ثبت و تأیید می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `کیلو ${tag}`);
    const cake = await createProduct(api, { code: `CK-${tag}`, name: `کیک ${tag}`, unitId, supplyType: 2 });
    const flour = await createProduct(api, { code: `FL-${tag}`, name: `آرد ${tag}`, unitId });
    const sugar = await createProduct(api, { code: `SG-${tag}`, name: `شکر ${tag}`, unitId });
    // فرمول برای ۱۰ کیلو کیک: ۲ آرد با ۵٪ ضایعات و ۱ شکر
    await createBom(api, {
      productId: cake,
      title: `فرمول کیک ${tag}`,
      baseQuantity: 10,
      components: [
        { productId: flour, unitId, quantity: 2, wastePercentage: 5 },
        { productId: sugar, unitId, quantity: 1 },
      ],
    });

    await page.goto("/production/orders");
    await page.getByRole("button", { name: "سفارش تولید جدید" }).click();
    await pickProduct(page, "کالای تولیدی", `CK-${tag}`);
    await expect(page.getByRole("combobox", { name: "فرمول ساخت" })).toContainText(`فرمول کیک ${tag}`);
    await page.getByLabel(/^مقدار تولید/).fill("25");
    // ۲۵ کیلو = ۲.۵ برابر فرمول؛ آرد ۵ + ۵٪ ضایعات
    const flourRow = page.getByRole("table", { name: "نیاز مواد" }).getByRole("row").filter({ hasText: `آرد ${tag}` });
    await expect(flourRow).toContainText("۵٫۲۵");
    const saved = waitForSave(page, "POST", /\/Production\/Orders$/);
    await page.getByRole("button", { name: "ثبت سفارش" }).click();
    const orderId = (await (await saved).json()).id;
    await expect(page.getByText("سفارش تولید ثبت شد")).toBeVisible();

    const order = await (await api.get(`${ORDERS}/${orderId}`)).json();
    expect(order).toMatchObject({ orderNumber: expect.stringMatching(/^MO-\d{5}$/), quantity: 25, statusId: 1 });
    expect(order.materials.find((m: { productId: number }) => m.productId === sugar).requiredQuantity).toBe(2.5);

    // صفحه سفارش در تب جدید باز می‌شود و از همان‌جا تأیید می‌شود
    await expect(page.getByRole("heading", { name: new RegExp(order.orderNumber) })).toContainText("پیش‌نویس");
    await page.getByRole("button", { name: "تأیید سفارش" }).click();
    await expect(page.getByText("سفارش تولید تأیید شد")).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(order.orderNumber) })).toContainText("تأیید شده");
    await expect(page.getByRole("button", { name: "ویرایش" })).toHaveCount(0);

    // سفارش تأییدشده ویرایش و حذف نمی‌شود ولی ابطال می‌شود
    const edit = await api.put(`${ORDERS}/${orderId}`, { data: { id: orderId, quantity: 30 } });
    expect(edit.status()).toBe(422);
    expect((await api.delete(`${ORDERS}/${orderId}`)).status()).toBe(422);
    expect((await api.post(`${ORDERS}/${orderId}/cancel`)).status()).toBe(204);
    expect((await api.post(`${ORDERS}/${orderId}/release`)).status()).toBe(422);

    // کالای بدون فرمول سفارش تولید نمی‌گیرد
    const noBom = await api.post(ORDERS, { data: { productId: flour, quantity: 1 } });
    expect(noBom.status()).toBe(422);
    expect(await noBom.text()).toContain("فرمول");

    await api.dispose();
  });
});
