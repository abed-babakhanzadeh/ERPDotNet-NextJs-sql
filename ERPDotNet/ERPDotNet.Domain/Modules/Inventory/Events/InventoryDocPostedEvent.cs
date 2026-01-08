using ERPDotNet.Domain.Common;
using ERPDotNet.Domain.Modules.Inventory.Entities;

namespace ERPDotNet.Domain.Modules.Inventory.Events;

public class InventoryDocPostedEvent : BaseEvent
{
    public InventoryDocHeader DocHeader { get; }

    public InventoryDocPostedEvent(InventoryDocHeader docHeader)
    {
        DocHeader = docHeader;
    }
}