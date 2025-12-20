using Microsoft.AspNetCore.Mvc;

namespace ERPDotNet.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public UploadController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("فایلی انتخاب نشده است.");

        // --- اصلاحیه مهم برای رفع خطای Null ---
        // اگر WebRootPath نال بود (یعنی پوشه wwwroot نیست)، مسیر را دستی میسازیم
        string webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        
        var uploadsFolder = Path.Combine(webRootPath, "uploads");

        // اگر پوشه wwwroot وجود نداشت، آن را بساز
        if (!Directory.Exists(webRootPath))
            Directory.CreateDirectory(webRootPath);
            
        // اگر پوشه uploads وجود نداشت، آن را بساز
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);
        // ---------------------------------------

        // تولید نام منحصر به فرد
        var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // آدرس نسبی برای ذخیره در دیتابیس
        var url = $"/uploads/{uniqueFileName}";
        
        return Ok(new { path = url });
    }
}