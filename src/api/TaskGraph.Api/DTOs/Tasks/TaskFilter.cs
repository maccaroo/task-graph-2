using TaskGraph.Api.Models;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Api.DTOs.Tasks;

public class TaskFilter
{
    public Guid? AssigneeId { get; set; }
    public TaskPriority? Priority { get; set; }
    public List<string>? Tags { get; set; }
    public TaskStatus? Status { get; set; }
    public DueStatus? DueStatus { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
