import { expect, test, type Page } from "@playwright/test";
import { adminApi, createBom, createProduct, createUnit, uid } from "./helpers";

async function pickProduct(page: Page, combobox: string, code: string) {
  await page.getByRole("combobox", { name: combobox }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(code);
  await page.getByRole("button", { name: new RegExp(code) }).click();
}

test.describe("فرمول ساخت (BOM)", () => {
  // نسخه «سرور کند» جلوی برگشت باگی را می‌گیرد که پاسخ دیر واحدها، مقدار واردشده یا سطرهای دیگر را پاک می‌کرد
  for (const slow of [false, true]) {
    test(`ثبت BOM با دو ماده اولیه از فرم${slow ? " (سرور کند)" : ""}`, async ({
      page,
    }) => {
      if (slow) {
        await page.route(/\/BaseInfo\/Products\/\d+$/, async (route) => {
          await new Promise((r) => setTimeout(r, 1500));
          await route.continue();
        });
      }
      const api = await adminApi();
      const tag = uid();
      const unitId = await createUnit(api, `عدد ${tag}`);
      const parentCode = `CH-${tag}`;
      const parentId = await createProduct(api, {
        code: parentCode,
        name: `صندلی ${tag}`,
        unitId,
        supplyType: 2,
      });
      const legCode = `LG-${tag}`;
      const legId = await createProduct(api, {
        code: legCode,
        name: `پایه ${tag}`,
        unitId,
      });
      const seatCode = `ST-${tag}`;
      const seatId = await createProduct(api, {
        code: seatCode,
        name: `نشیمن ${tag}`,
        unitId,
      });

      await page.goto("/product-engineering/boms/create");
      await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", parentCode);
      await page.getByLabel("عنوان فرمول").fill(`فرمول صندلی ${tag}`);

      const components = [
        { code: legCode, qty: "4" },
        { code: seatCode, qty: "1" },
      ];
      for (let i = 0; i < components.length; i++) {
        await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
        await pickProduct(page, `ماده اولیه ردیف ${i + 1}`, components[i].code);
        await page
          .getByLabel(`مقدار مصرفی ردیف ${i + 1}`)
          .fill(components[i].qty);
        // واحد ردیف بعد از انتخاب کالا از سرور می‌آید و فرم تا رسیدنش ثبت نمی‌کند
        await expect(page.getByLabel(`واحد مصرفی ردیف ${i + 1}`)).toContainText(
          `عدد ${tag}`,
        );
      }

      const created = page.waitForResponse(
        (r) =>
          r.request().method() === "POST" &&
          /\/ProductEngineering\/BOMs$/.test(r.url()),
      );
      await page.getByRole("button", { name: "ثبت", exact: true }).click();
      const res = await created;
      expect(res.status()).toBeLessThan(300);
      const bomId = Number(await res.text());

      const bom = await (
        await api.get(`/api/ProductEngineering/BOMs/${bomId}`)
      ).json();
      expect(bom.productId).toBe(parentId);
      const lines = Object.fromEntries(
        bom.details.map((d: { childProductId: number; quantity: number }) => [
          d.childProductId,
          d.quantity,
        ]),
      );
      expect(lines).toEqual({ [legId]: 4, [seatId]: 1 });
      await api.dispose();
    });
  }

  test("BOM چرخه‌ای (الف در ب و ب در الف) رد می‌شود", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const aCode = `A-${tag}`;
    const aId = await createProduct(api, {
      code: aCode,
      name: `نیمه‌ساخته الف ${tag}`,
      unitId,
      supplyType: 2,
    });
    const bCode = `B-${tag}`;
    const bId = await createProduct(api, {
      code: bCode,
      name: `نیمه‌ساخته ب ${tag}`,
      unitId,
      supplyType: 2,
    });
    await createBom(api, {
      productId: aId,
      title: `الف ${tag}`,
      components: [{ productId: bId, unitId, quantity: 1 }],
    });

    await page.goto("/product-engineering/boms/create");
    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", bCode);
    await page.getByLabel("عنوان فرمول").fill(`ب ${tag}`);
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "ماده اولیه ردیف 1", aCode);
    await page.getByLabel("مقدار مصرفی ردیف 1").fill("1");
    await expect(page.getByLabel("واحد مصرفی ردیف 1")).toContainText(
      `عدد ${tag}`,
    );

    const rejected = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/ProductEngineering\/BOMs$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    expect((await rejected).status()).toBe(400);
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    await expect(page).toHaveURL(/\/boms\/create$/);
    await api.dispose();
  });

  test("اعتبارسنجی فرم قبل از ارسال", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const parentCode = `VL-${tag}`;
    await createProduct(api, {
      code: parentCode,
      name: `کمد ${tag}`,
      unitId,
      supplyType: 2,
    });

    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST" && /\/ProductEngineering\/BOMs$/.test(r.url()))
        posted = true;
    });
    const toast = page.locator("[data-sonner-toast]");
    const title = page.getByLabel("عنوان فرمول");

    await page.goto("/product-engineering/boms/create");
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(
      toast.filter({ hasText: "کالا/قلم نهایی انتخاب نشده" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "کالا/قلم (محصول یا نیمه ساخته)" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(title).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("عنوان فرمول الزامی است.")).toBeVisible();

    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", parentCode);
    await title.fill(`کمد ${tag}`);
    await expect(title).not.toHaveAttribute("aria-invalid", "true");

    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(
      toast.filter({ hasText: "اقلام فرمول وارد نشده" }),
    ).toBeVisible();

    // سطر خالی با شماره همان ردیف جدول گزارش می‌شود
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(
      toast.filter({ hasText: "ردیف 1: کالا/قلم انتخاب نشده است." }),
    ).toBeVisible();

    await expect(page).toHaveURL(/\/boms\/create$/);
    expect(posted).toBe(false);
    await api.dispose();
  });
});

test.describe("فرمول ساخت (BOM): جایگزین و ویرایش", () => {
  test("تعریف کالای جایگزین برای یک ماده اولیه", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const parentCode = `TB-${tag}`;
    const parentId = await createProduct(api, {
      code: parentCode,
      name: `میز ${tag}`,
      unitId,
      supplyType: 2,
    });
    const mainCode = `MD-${tag}`;
    const mainId = await createProduct(api, {
      code: mainCode,
      name: `صفحه MDF ${tag}`,
      unitId,
    });
    const subCode = `PB-${tag}`;
    const subId = await createProduct(api, {
      code: subCode,
      name: `صفحه نئوپان ${tag}`,
      unitId,
    });

    await page.goto("/product-engineering/boms/create");
    await pickProduct(page, "کالا/قلم (محصول یا نیمه ساخته)", parentCode);
    await page.getByLabel("عنوان فرمول").fill(`فرمول میز ${tag}`);
    await page.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await pickProduct(page, "ماده اولیه ردیف 1", mainCode);
    await page.getByLabel("مقدار مصرفی ردیف 1").fill("2");
    await expect(page.getByLabel("واحد مصرفی ردیف 1")).toContainText(
      `عدد ${tag}`,
    );

    await page.getByRole("button", { name: "جایگزین‌های ردیف 1" }).click();
    const dialog = page.getByRole("dialog", { name: /جایگزین‌ها برای/ });
    await expect(dialog).toContainText(`صفحه MDF ${tag}`);
    await dialog.getByRole("button", { name: "افزودن سطر جدید" }).click();
    await dialog
      .getByRole("combobox", { name: "کالای جایگزین ردیف 1" })
      .click();
    await page.getByPlaceholder("انتخاب کالا/قلم...").last().fill(subCode);
    await page.getByRole("button", { name: new RegExp(subCode) }).click();
    await dialog.getByLabel("ضریب ردیف 1").fill("1.5");
    await dialog.getByRole("button", { name: "تایید" }).click();
    await expect(
      page.getByRole("button", { name: "جایگزین‌های ردیف 1 (1)" }),
    ).toBeVisible();

    const created = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/ProductEngineering\/BOMs$/.test(r.url()),
    );
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    const res = await created;
    expect(res.status()).toBeLessThan(300);
    const bomId = Number(await res.text());

    const bom = await (
      await api.get(`/api/ProductEngineering/BOMs/${bomId}`)
    ).json();
    expect(bom.productId).toBe(parentId);
    expect(bom.details).toHaveLength(1);
    expect(bom.details[0]).toMatchObject({
      childProductId: mainId,
      quantity: 2,
    });
    expect(bom.details[0].substitutes).toHaveLength(1);
    expect(bom.details[0].substitutes[0]).toMatchObject({
      substituteProductId: subId,
      factor: 1.5,
      priority: 1,
    });
    await api.dispose();
  });

  test("ویرایش BOM: تغییر مقدار و حذف یک ماده اولیه", async ({ page }) => {
    const api = await adminApi();
    const tag = uid();
    const unitId = await createUnit(api, `عدد ${tag}`);
    const parentId = await createProduct(api, {
      code: `BD-${tag}`,
      name: `تخت ${tag}`,
      unitId,
      supplyType: 2,
    });
    const aId = await createProduct(api, {
      code: `FA-${tag}`,
      name: `چوب ${tag}`,
      unitId,
    });
    const bId = await createProduct(api, {
      code: `FB-${tag}`,
      name: `پیچ ${tag}`,
      unitId,
    });
    const bomId = await createBom(api, {
      productId: parentId,
      title: `تخت ${tag}`,
      components: [
        { productId: aId, unitId, quantity: 3 },
        { productId: bId, unitId, quantity: 20 },
      ],
    });

    await page.goto(`/product-engineering/boms/edit/${bomId}`);
    await expect(page.getByLabel("مقدار مصرفی ردیف 2")).toHaveValue("20");
    await expect(page.getByText("ذخیره نشده")).toHaveCount(0);

    await page.getByLabel("مقدار مصرفی ردیف 1").fill("5");
    await page
      .getByRole("row")
      .filter({ has: page.getByLabel("مقدار مصرفی ردیف 2") })
      .getByRole("button", { name: "حذف" })
      .click();
    await expect(page.getByLabel("مقدار مصرفی ردیف 2")).toHaveCount(0);
    await expect(page.getByText("ذخیره نشده")).toBeVisible();

    const saved = page.waitForResponse(
      (r) =>
        r.request().method() === "PUT" &&
        r.url().includes(`/ProductEngineering/BOMs/${bomId}`),
    );
    await page.getByRole("button", { name: "ثبت", exact: true }).click();
    expect((await saved).status()).toBeLessThan(300);

    const bom = await (
      await api.get(`/api/ProductEngineering/BOMs/${bomId}`)
    ).json();
    const lines = Object.fromEntries(
      bom.details.map((d: { childProductId: number; quantity: number }) => [
        d.childProductId,
        d.quantity,
      ]),
    );
    expect(lines).toEqual({ [aId]: 5 });
    await api.dispose();
  });
});
