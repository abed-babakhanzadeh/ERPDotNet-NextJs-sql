import {
  expect,
  request,
  test,
  type APIRequestContext,
} from "@playwright/test";
import {
  API_URL,
  adminApi,
  createDoc,
  createProduct,
  createReceiptDocType,
  createUnit,
  createWarehouse,
  uid,
} from "./helpers";

const PROCESS_CODE = "INVENTORY_V1";
// مجوزهای کارتابل: مشاهده، جزئیات، اقدام و تفویض
const INBOX_PERMISSIONS = [4100, 4101, 4102, 4103, 4104];

async function ok(
  res: Awaited<ReturnType<APIRequestContext["get"]>>,
  what: string,
) {
  if (!res.ok())
    throw new Error(`${what}: ${res.status()} ${await res.text()}`);
  return res;
}

/** فرآیند تأیید اسناد انبار؛ روی دیتابیس تازه با ابزار توسعه ساخته می‌شود */
async function inventoryProcess(api: APIRequestContext) {
  const find = async () =>
    (
      await (
        await api.post("/api/Workflow/Tasks/processes/list", {
          data: { pageNumber: 1, pageSize: 100 },
        })
      ).json()
    ).items.find(
      (p: { processCode: string }) => p.processCode === PROCESS_CODE,
    );
  if (!(await find()))
    await ok(await api.get("/api/Workflow/Tasks/ultimate-seed"), "ساخت فرآیند");
  const { id } = await find();
  return (await api.get(`/api/Workflow/Tasks/processes/${id}`)).json();
}

async function createUserWithRole(
  api: APIRequestContext,
  tag: string,
  name: string,
) {
  const roleName = `${name}-${tag}`;
  const role = await (
    await ok(
      await api.post("/api/Roles", { data: { name: roleName } }),
      "ساخت نقش",
    )
  ).json();
  await ok(
    await api.post("/api/Permissions/assign-role", {
      data: { roleId: role.id, permissionIds: INBOX_PERMISSIONS },
    }),
    "دسترسی نقش",
  );
  const username = `${name.toLowerCase()}${tag}`;
  const password = "Passw0rd!x";
  const user = await (
    await ok(
      await api.post("/api/Users", {
        data: {
          firstName: name,
          lastName: tag,
          username,
          email: `${username}@e2e.local`,
          password,
          roles: [roleName],
        },
      }),
      "ساخت کاربر",
    )
  ).json();
  const login = await (
    await ok(
      await (
        await request.newContext({ baseURL: API_URL })
      ).post("/api/Auth/login", {
        data: { username, password },
      }),
      "ورود کاربر",
    )
  ).json();
  const client = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${login.token}` },
  });
  return {
    id: user.id as string,
    roleId: role.id as string,
    fullName: `${name} ${tag}`,
    token: login.token as string,
    api: client,
  };
}

async function inboxTask(api: APIRequestContext, docId: number) {
  const res = await api.post("/api/Workflow/Tasks/inbox", {
    data: { pageNumber: 1, pageSize: 100, processCode: PROCESS_CODE },
  });
  return (await res.json()).items.find(
    (t: { targetRecordId: number }) => t.targetRecordId === docId,
  );
}

async function complete(
  api: APIRequestContext,
  taskId: number,
  actionTitle: string,
) {
  const task = await (await api.get(`/api/Workflow/Tasks/${taskId}`)).json();
  const transition = task.availableTransitions.find(
    (t: { actionTitle: string }) => t.actionTitle === actionTitle,
  );
  return api.post(`/api/Workflow/Tasks/${taskId}/complete`, {
    data: { taskId, transitionId: transition?.transitionId ?? 0 },
  });
}

test.describe("سررسید و تفویض اختیار کارتابل", () => {
  test("کار مرحلهٔ دارای SLA سررسید می‌گیرد و گیرندهٔ تفویض با نقش تفویض‌کننده اقدام می‌کند", async ({
    page,
    browser,
    baseURL,
  }) => {
    const api = await adminApi();
    const tag = uid();
    const process = await inventoryProcess(api);
    const review = process.states.find(
      (s: { stateCode: string }) => s.stateCode === "REVIEW",
    );
    const approver = await createUserWithRole(api, tag, "Approver");
    const clerk = await createUserWithRole(api, tag, "Clerk");

    // مرحله بررسی: مهلت ۴ ساعت و دکمه‌هایش فقط برای نقش تأییدکننده
    await page.goto(`/workflow/designer/${process.id}`);
    await page
      .getByRole("button", { name: `سررسید مرحله ${review.title}` })
      .click();
    await page.getByLabel("مهلت انجام (ساعت)").fill("4");
    await page.getByRole("button", { name: "ذخیره سررسید" }).click();
    await expect(page.getByText("سررسید مرحله ذخیره شد")).toBeVisible();
    await expect(page.getByText("مهلت 4 ساعت")).toBeVisible();
    for (const t of process.transitions.filter(
      (t: { fromStateId: number }) => t.fromStateId === review.id,
    ))
      await ok(
        await api.put(`/api/Workflow/Tasks/transitions/${t.id}/roles`, {
          data: [approver.roleId],
        }),
        "نقش دکمه",
      );

    // سند رسید وارد گردش کار می‌شود و admin آن را به مرحله بررسی می‌فرستد
    const unitId = await createUnit(api, `عدد ${tag}`);
    const productId = await createProduct(api, {
      code: `WF-${tag}`,
      name: `کالا ${tag}`,
      unitId,
    });
    const warehouse = await createWarehouse(api, tag);
    const receipt = await createReceiptDocType(api, tag);
    const docId = await createDoc(api, {
      docTypeId: receipt.id,
      warehouseId: warehouse.warehouseId,
      lines: [{ productId, quantity: 3, locationId: warehouse.locationId }],
    });
    await ok(
      await api.post(`/api/Inventory/Inventory/docs/${docId}/submit`),
      "ارسال سند",
    );
    const draftTask = await inboxTask(api, docId);
    await ok(
      await complete(api, draftTask.taskId, "ارسال برای تایید مدیر"),
      "ارسال به بررسی",
    );

    const reviewTask = await inboxTask(api, docId);
    const due = new Date(reviewTask.dueDate).getTime() - Date.now();
    expect(due).toBeGreaterThan(3.9 * 3600e3);
    expect(due).toBeLessThan(4.1 * 3600e3);
    expect(reviewTask.isOverdue).toBe(false);
    await page.goto("/workflow/inbox");
    // ستون سررسید ساعت را هم نشان می‌دهد (ارقام فارسی)
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: `بررسی پرونده شماره ${docId}` })
        .getByText(/[۰-۹]{1,2}:[۰-۹]{2}/),
    ).toBeVisible();

    // پیش از تفویض، کارمند این کار را نمی‌بیند و نمی‌تواند اقدام کند
    expect(await inboxTask(clerk.api, docId)).toBeUndefined();

    // تأییدکننده از صفحهٔ تفویض، اختیارش را به کارمند می‌سپارد
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL!).origin,
            localStorage: [{ name: "accessToken", value: approver.token }],
          },
        ],
      },
    });
    const approverPage = await context.newPage();
    await approverPage.goto("/workflow/delegations");
    await approverPage.getByRole("button", { name: "تفویض جدید" }).click();
    await approverPage.getByRole("combobox", { name: "گیرنده تفویض" }).click();
    await approverPage
      .getByRole("option", { name: new RegExp(clerk.fullName) })
      .click();
    await approverPage.getByLabel("دلیل").fill("مرخصی");
    await approverPage.getByRole("button", { name: "ثبت تفویض" }).click();
    await expect(approverPage.getByText("تفویض اختیار ثبت شد")).toBeVisible();
    const row = approverPage
      .getByRole("row")
      .filter({ hasText: clerk.fullName });
    await expect(row.getByText("فعال")).toBeVisible();
    await context.close();

    // کارمند حالا کار را با سررسیدش می‌بیند و از طرف تأییدکننده برمی‌گرداند
    const clerkTask = await inboxTask(clerk.api, docId);
    expect(clerkTask?.dueDate).toBeTruthy();
    await ok(
      await complete(clerk.api, clerkTask.taskId, "رد و ارجاع جهت اصلاح"),
      "اقدام با تفویض",
    );

    const history = (
      await (await api.get(`/api/Workflow/Tasks/${clerkTask.taskId}`)).json()
    ).history;
    expect(history.at(-1)).toMatchObject({
      actionTitle: "رد و ارجاع جهت اصلاح",
      performedBy: clerk.fullName,
      onBehalfOf: approver.fullName,
    });

    // پس از لغو، تفویض دیگر اثری ندارد
    const delegations = await (
      await approver.api.get("/api/Workflow/Tasks/delegations")
    ).json();
    const mine = delegations.find(
      (d: { toUserId: string }) => d.toUserId === clerk.id,
    );
    await ok(
      await approver.api.post(
        `/api/Workflow/Tasks/delegations/${mine.id}/revoke`,
      ),
      "لغو تفویض",
    );
    const received = await (
      await clerk.api.get("/api/Workflow/Tasks/delegations")
    ).json();
    expect(
      received.find((d: { id: number }) => d.id === mine.id),
    ).toMatchObject({ isRevoked: true, isActive: false });

    await Promise.all([
      api.dispose(),
      approver.api.dispose(),
      clerk.api.dispose(),
    ]);
  });
});
