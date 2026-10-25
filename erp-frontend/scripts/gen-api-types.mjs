// تولید تایپ‌های TypeScript از قرارداد OpenAPI بک‌اند.
//   npm run api:types          سند را از بک‌اند دوباره می‌سازد (نیاز به dotnet) و تایپ‌ها را تولید می‌کند
//   npm run api:types -- --no-build   فقط از openapi/ERPDotNet.API.json موجود تایپ می‌سازد
// خروجی src/types/api.generated.ts دستی ویرایش نمی‌شود.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = resolve(root, "openapi/ERPDotNet.API.json");
const out = resolve(root, "src/types/api.generated.ts");

if (!process.argv.includes("--no-build")) {
  execSync("dotnet build ERPDotNet.API -p:OpenApiGenerateDocuments=true -v:q -nologo", {
    cwd: resolve(root, "../ERPDotNet"),
    stdio: "inherit",
  });
}

execSync(`npx openapi-typescript "${spec}" -o "${out}"`, { cwd: root, stdio: "inherit" });

// .NET اعداد را «عدد یا رشته» اعلام می‌کند (خواندن عدد از رشته مجاز است)؛ فرانت همیشه عدد می‌فرستد
const text = readFileSync(out, "utf8").replaceAll("number | string", "number");
writeFileSync(
  out,
  "// ⚠️ تولید خودکار از قرارداد OpenAPI بک‌اند — دستی ویرایش نکنید. (npm run api:types)\n" + text,
);
console.log("api types updated:", out);
