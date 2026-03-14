namespace TaskGraph.Api.Models;

public class TaskRelationship
{
    public Guid TaskId { get; set; }
    public TaskItem Task { get; set; } = null!;

    public Guid PredecessorId { get; set; }
    public TaskItem Predecessor { get; set; } = null!;

    public RelationshipType RelationshipType { get; set; } = RelationshipType.Exclusive;
}
