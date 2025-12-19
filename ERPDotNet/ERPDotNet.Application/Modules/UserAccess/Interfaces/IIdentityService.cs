using System.Collections.Generic;
using System.Threading.Tasks;

namespace ERPDotNet.Application.Modules.UserAccess.Interfaces;

public interface IIdentityService
{
    Task<bool> CheckPasswordAsync(string username, string password);
    Task<string?> GetUserNameAsync(string userId);
    Task<IList<string>> GetUserRolesAsync(string userId);
    
    Task<(bool IsSuccess, string UserId, IEnumerable<string> Errors)> CreateUserAsync(
        string username, 
        string password, 
        string email, 
        string firstName, 
        string lastName, 
        string? personnelCode, 
        string? nationalCode,
        List<string> roles);

    Task<bool> DeleteUserAsync(string userId);
    Task<bool> IsInRoleAsync(string userId, string role);
}