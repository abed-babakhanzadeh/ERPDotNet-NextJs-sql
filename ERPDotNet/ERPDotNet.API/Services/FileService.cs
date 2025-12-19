using ERPDotNet.Application.Common.Interfaces;

namespace ERPDotNet.API.Services;

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _environment;

    public FileService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public void DeleteFile(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return;

        // 1. پیدا کردن مسیر روت (دقیقاً مثل UploadController)
        string webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        
        // 2. ساخت مسیر کامل
        var fileName = relativePath.TrimStart('/', '\\');
        var fullPath = Path.Combine(webRootPath, fileName);

        // 3. حذف فایل
        if (File.Exists(fullPath))
        {
            try
            {
                File.Delete(fullPath);
            }
            catch (Exception ex)
            {
                // لاگ کردن خطا (اختیاری)
                Console.WriteLine($"Error deleting file: {ex.Message}");
            }
        }
    }
}