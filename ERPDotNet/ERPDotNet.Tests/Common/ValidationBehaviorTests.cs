using ERPDotNet.Application.Common.Behaviors;
using ERPDotNet.Application.Modules.Inventory.Commands.SetBatchQcStatus;
using ERPDotNet.Domain.Modules.Inventory.Entities;
using FluentValidation;
using MediatR;
using Xunit;

namespace ERPDotNet.Tests.Common;

public class ValidationBehaviorTests
{
    [Fact]
    public async Task Void_commands_are_validated_too()
    {
        // دستور بدون خروجی (IRequest) پیش‌تر از قید IRequest<TResponse> رد می‌شد و ولیدیتورش اجرا نمی‌شد
        var behavior = new ValidationBehavior<SetBatchQcStatusCommand, Unit>(
            new IValidator<SetBatchQcStatusCommand>[] { new SetBatchQcStatusValidator() });
        var reached = false;

        await Assert.ThrowsAsync<ValidationException>(() => behavior.Handle(
            new SetBatchQcStatusCommand { Id = 1, QcStatus = BatchQcStatus.Rejected },
            _ => { reached = true; return Task.FromResult(Unit.Value); },
            CancellationToken.None));
        Assert.False(reached);
    }
}
