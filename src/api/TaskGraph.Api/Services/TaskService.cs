using Microsoft.EntityFrameworkCore;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Tasks;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Api.Services;

public class TaskService(AppDbContext db) : ITaskService
{
    public async Task<IEnumerable<TaskResponse>> GetAllAsync(TaskFilter filter)
    {
        var query = db.Tasks
            .Include(t => t.Assignee)
            .Include(t => t.Predecessors)
            .Include(t => t.Successors)
            .AsQueryable();

        if (filter.AssigneeId.HasValue)
            query = query.Where(t => t.AssigneeId == filter.AssigneeId.Value);

        if (filter.Priority.HasValue)
            query = query.Where(t => t.Priority == filter.Priority.Value);

        if (filter.Status.HasValue)
            query = query.Where(t => t.Status == filter.Status.Value);

        if (filter.FromDate.HasValue)
            query = query.Where(t => t.EndDate == null || t.EndDate >= filter.FromDate.Value);

        if (filter.ToDate.HasValue)
            query = query.Where(t => t.StartDate == null || t.StartDate <= filter.ToDate.Value);

        var tasks = await query.ToListAsync();

        if (filter.Tags is { Count: > 0 })
            tasks = tasks.Where(t => filter.Tags.All(tag => t.Tags.Contains(tag))).ToList();

        if (filter.DueStatus.HasValue)
        {
            var now = DateTime.UtcNow;
            var soon = now.AddDays(7);
            tasks = filter.DueStatus.Value switch
            {
                DueStatus.NoDueDate => tasks.Where(t => t.EndType == TimingType.None || !t.EndDate.HasValue).ToList(),
                DueStatus.Upcoming => tasks.Where(t => t.EndDate.HasValue && t.EndDate > soon).ToList(),
                DueStatus.DueSoon => tasks.Where(t => t.EndDate.HasValue && t.EndDate >= now && t.EndDate <= soon).ToList(),
                DueStatus.Overdue => tasks.Where(t => t.EndDate.HasValue && t.EndDate < now && t.Status == TaskStatus.Incomplete).ToList(),
                _ => tasks
            };
        }

        return tasks.Select(ToResponse);
    }

    public async Task<TaskResponse> GetByIdAsync(Guid id)
    {
        var task = await LoadTaskAsync(id);
        return ToResponse(task);
    }

    public async Task<TaskResponse> CreateAsync(CreateTaskRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Title is required.");

        if (request.AssigneeId.HasValue && !await db.Users.AnyAsync(u => u.Id == request.AssigneeId.Value))
            throw new NotFoundException($"User {request.AssigneeId.Value} not found.");

        var task = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            AssigneeId = request.AssigneeId,
            Status = request.Status,
            Priority = request.Priority,
            Tags = request.Tags ?? [],
            StartType = request.StartType,
            StartDate = request.StartDate,
            EndType = request.EndType,
            EndDate = request.EndDate,
            Duration = request.Duration
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync();
        return ToResponse(await LoadTaskAsync(task.Id));
    }

    public async Task<TaskResponse> UpdateAsync(Guid id, UpdateTaskRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Title is required.");

        var task = await LoadTaskAsync(id);

        if (request.AssigneeId.HasValue && !await db.Users.AnyAsync(u => u.Id == request.AssigneeId.Value))
            throw new NotFoundException($"User {request.AssigneeId.Value} not found.");

        task.Title = request.Title;
        task.Description = request.Description;
        task.AssigneeId = request.AssigneeId;
        task.Status = request.Status;
        task.Priority = request.Priority;
        task.Tags = request.Tags;
        task.StartType = request.StartType;
        task.StartDate = request.StartDate;
        task.EndType = request.EndType;
        task.EndDate = request.EndDate;
        task.Duration = request.Duration;

        await db.SaveChangesAsync();
        return ToResponse(await LoadTaskAsync(id));
    }

    public async Task DeleteAsync(Guid id)
    {
        var task = await db.Tasks.FindAsync(id)
            ?? throw new NotFoundException($"Task {id} not found.");

        db.Tasks.Remove(task);
        await db.SaveChangesAsync();
    }

    public async Task<TaskResponse> UpdatePositionAsync(Guid id, UpdateTaskPositionRequest request)
    {
        var task = await db.Tasks.FindAsync(id)
            ?? throw new NotFoundException($"Task {id} not found.");

        task.PinnedPosition = new PinnedPosition { X = request.X, Y = request.Y };
        await db.SaveChangesAsync();
        return ToResponse(await LoadTaskAsync(id));
    }

    public async Task<TaskResponse> AddPredecessorAsync(Guid taskId, Guid predecessorId)
    {
        if (taskId == predecessorId)
            throw new ValidationException("A task cannot be its own predecessor.");

        var task = await db.Tasks
            .Include(t => t.Predecessors)
            .Include(t => t.Successors)
            .FirstOrDefaultAsync(t => t.Id == taskId)
            ?? throw new NotFoundException($"Task {taskId} not found.");

        var predecessor = await db.Tasks.FindAsync(predecessorId)
            ?? throw new NotFoundException($"Task {predecessorId} not found.");

        if (task.Predecessors.Any(p => p.PredecessorId == predecessorId))
            throw new ConflictException("Predecessor relationship already exists.");

        if (predecessor.EndDate.HasValue && task.StartDate.HasValue
            && predecessor.EndDate > task.StartDate)
        {
            throw new ValidationException("Predecessor must end before or when the task starts.");
        }

        db.TaskRelationships.Add(new TaskRelationship { TaskId = taskId, PredecessorId = predecessorId });
        await db.SaveChangesAsync();
        return ToResponse(await LoadTaskAsync(taskId));
    }

    public async Task DeletePredecessorAsync(Guid taskId, Guid predecessorId)
    {
        var rel = await db.TaskRelationships
            .FirstOrDefaultAsync(r => r.TaskId == taskId && r.PredecessorId == predecessorId)
            ?? throw new NotFoundException("Predecessor relationship not found.");

        db.TaskRelationships.Remove(rel);
        await db.SaveChangesAsync();
    }

    private async Task<TaskItem> LoadTaskAsync(Guid id) =>
        await db.Tasks
            .Include(t => t.Assignee)
            .Include(t => t.Predecessors)
            .Include(t => t.Successors)
            .FirstOrDefaultAsync(t => t.Id == id)
        ?? throw new NotFoundException($"Task {id} not found.");

    private static TaskResponse ToResponse(TaskItem t) => new(
        t.Id,
        t.Title,
        t.Description,
        t.AssigneeId,
        t.Assignee?.Username,
        t.Status,
        t.Priority,
        t.Tags,
        t.StartType,
        t.StartDate,
        t.EndType,
        t.EndDate,
        t.Duration,
        t.PinnedPosition is { } p ? new PinnedPositionDto(p.X, p.Y) : null,
        t.Predecessors.Select(r => r.PredecessorId).ToList(),
        t.Successors.Select(r => r.TaskId).ToList()
    );
}
