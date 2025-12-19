using MediatR;
using ERPDotNet.Application.Modules.BaseInfo.Queries.GetAllProducts; // جایی که ProductDto هست

namespace ERPDotNet.Application.Modules.BaseInfo.Queries.GetProductById;

public class GetProductByIdQuery : IRequest<ProductDto?>
{
    public int Id { get; set; }

    public GetProductByIdQuery(int id)
    {
        Id = id;
    }
}