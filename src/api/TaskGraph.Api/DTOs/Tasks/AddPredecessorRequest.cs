using TaskGraph.Api.Models;

namespace TaskGraph.Api.DTOs.Tasks;

public record AddPredecessorRequest(RelationshipType RelationshipType = RelationshipType.Exclusive);
