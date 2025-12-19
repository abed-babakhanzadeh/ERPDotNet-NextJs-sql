using ERPDotNet.Domain.Modules.UserAccess.Entities;

namespace ERPDotNet.Application.Modules.UserAccess.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user, IList<string> roles);
}