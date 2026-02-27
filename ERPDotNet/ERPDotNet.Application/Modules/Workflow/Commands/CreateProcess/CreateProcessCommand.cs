using ERPDotNet.Application.Common.Exceptions;
using ERPDotNet.Application.Common.Interfaces;
using ERPDotNet.Domain.Modules.Workflow.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ERPDotNet.Application.Modules.Workflow.Commands.CreateProcess;

public record CreateProcessCommand(string ProcessCode, string Title, string TargetEntityName) : IRequest<int>;

public class CreateProcessCommandValidator : AbstractValidator<CreateProcessCommand>
{
    public CreateProcessCommandValidator()
    {
        RuleFor(v => v.ProcessCode).NotEmpty().MaximumLength(50);
        RuleFor(v => v.Title).NotEmpty().MaximumLength(200);
        RuleFor(v => v.TargetEntityName).NotEmpty().MaximumLength(100);
    }
}

public class CreateProcessCommandHandler : IRequestHandler<CreateProcessCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateProcessCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<int> Handle(CreateProcessCommand request, CancellationToken cancellationToken)
    {
        int companyId = int.TryParse(_currentUserService.CompanyId, out var cid) ? cid : 1;

        // بررسی تکراری نبودن کد فرآیند در این شرکت
        if (await _context.BpmsProcesses.AnyAsync(x => x.CompanyId == companyId && x.ProcessCode == request.ProcessCode, cancellationToken))
        {
            throw new BusinessRuleException("کد فرآیند تکراری است. لطفاً کد دیگری انتخاب کنید.");
        }

        // 1. ساخت بدنه اصلی فرآیند
        var process = new BpmsProcess
        {
            CompanyId = companyId,
            ProcessCode = request.ProcessCode,
            Title = request.Title,
            TargetEntityName = request.TargetEntityName,
            IsActive = true
        };

        _context.BpmsProcesses.Add(process);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. ساخت اتوماتیک نسخه 1 برای این فرآیند
        var version = new BpmsProcessVersion
        {
            ProcessId = process.Id,
            VersionNumber = 1,
            IsActive = true
        };

        _context.BpmsProcessVersions.Add(version);
        await _context.SaveChangesAsync(cancellationToken);

        return process.Id;
    }
}