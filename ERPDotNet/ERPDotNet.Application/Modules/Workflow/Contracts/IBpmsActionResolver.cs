namespace ERPDotNet.Application.Modules.Workflow.Contracts;

public interface IBpmsActionResolver
{
    // اگر اکشن کدی مثل "INVENTORY_POST" در دیتابیس بود، هندلر آن را برمی‌گرداند
    IBpmsActionHandler? Resolve(string actionCode);
}