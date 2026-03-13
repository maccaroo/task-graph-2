using Microsoft.EntityFrameworkCore;
using Moq;
using TaskGraph.Api.Data;
using TaskGraph.Api.DTOs.Tasks;
using TaskGraph.Api.Exceptions;
using TaskGraph.Api.Models;
using TaskGraph.Api.Services;
using TaskStatus = TaskGraph.Api.Models.TaskStatus;

namespace TaskGraph.Tests.Tasks;

public class TaskServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static (TaskService service, AppDbContext db, Mock<INotificationService> notifications) CreateService()
    {
        var db = CreateDb();
        var notifications = new Mock<INotificationService>();
        notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<NotificationType>(), It.IsAny<Guid?>(), It.IsAny<string>()))
            .Returns(System.Threading.Tasks.Task.CompletedTask);
        return (new TaskService(db, notifications.Object), db, notifications);
    }

    private static async Task<User> SeedUser(AppDbContext db, string username = "alice")
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            FirstName = "Alice",
            LastName = "Smith",
            Email = $"{username}@example.com",
            PasswordHash = "hash"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<TaskItem> SeedTask(AppDbContext db,
        string title = "Test Task",
        TaskStatus status = TaskStatus.Incomplete,
        TaskPriority priority = TaskPriority.Medium,
        List<string>? tags = null,
        Guid? assigneeId = null,
        TimingType startType = TimingType.None,
        DateTime? startDate = null,
        TimingType endType = TimingType.None,
        DateTime? endDate = null)
    {
        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            Title = title,
            Status = status,
            Priority = priority,
            Tags = tags ?? [],
            AssigneeId = assigneeId,
            StartType = startType,
            StartDate = startDate,
            EndType = endType,
            EndDate = endDate
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();
        return task;
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAll_NoFilter_ReturnsAllTasks()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "Task 1");
        await SeedTask(db, "Task 2");

        var result = (await service.GetAllAsync(new TaskFilter())).ToList();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAll_FilterByAssigneeId_ReturnsMatchingTasks()
    {
        var (service, db, _) = CreateService();
        var user = await SeedUser(db);
        await SeedTask(db, "Assigned", assigneeId: user.Id);
        await SeedTask(db, "Unassigned");

        var result = (await service.GetAllAsync(new TaskFilter { AssigneeId = user.Id })).ToList();

        Assert.Single(result);
        Assert.Equal("Assigned", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByPriority_ReturnsMatchingTasks()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "High", priority: TaskPriority.High);
        await SeedTask(db, "Low", priority: TaskPriority.Low);

        var result = (await service.GetAllAsync(new TaskFilter { Priority = TaskPriority.High })).ToList();

        Assert.Single(result);
        Assert.Equal("High", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByStatus_ReturnsMatchingTasks()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "Complete", status: TaskStatus.Complete);
        await SeedTask(db, "Incomplete", status: TaskStatus.Incomplete);

        var result = (await service.GetAllAsync(new TaskFilter { Status = TaskStatus.Complete })).ToList();

        Assert.Single(result);
        Assert.Equal("Complete", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByTags_AllTagsMustMatch()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "Both Tags", tags: ["backend", "urgent"]);
        await SeedTask(db, "One Tag", tags: ["backend"]);
        await SeedTask(db, "No Tags");

        var result = (await service.GetAllAsync(new TaskFilter { Tags = ["backend", "urgent"] })).ToList();

        Assert.Single(result);
        Assert.Equal("Both Tags", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByDueStatus_Overdue_ReturnsIncompleteWithPastEndDate()
    {
        var (service, db, _) = CreateService();
        var pastDate = DateTime.UtcNow.AddDays(-2);
        await SeedTask(db, "Overdue", status: TaskStatus.Incomplete, endType: TimingType.Fixed, endDate: pastDate);
        await SeedTask(db, "Complete Past", status: TaskStatus.Complete, endType: TimingType.Fixed, endDate: pastDate);
        await SeedTask(db, "Future", endType: TimingType.Fixed, endDate: DateTime.UtcNow.AddDays(10));

        var result = (await service.GetAllAsync(new TaskFilter { DueStatus = DueStatus.Overdue })).ToList();

        Assert.Single(result);
        Assert.Equal("Overdue", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByDueStatus_DueSoon_ReturnsTasksDueWithin7Days()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "Due Soon", endType: TimingType.Fixed, endDate: DateTime.UtcNow.AddDays(3));
        await SeedTask(db, "Upcoming", endType: TimingType.Fixed, endDate: DateTime.UtcNow.AddDays(10));
        await SeedTask(db, "No End Date");

        var result = (await service.GetAllAsync(new TaskFilter { DueStatus = DueStatus.DueSoon })).ToList();

        Assert.Single(result);
        Assert.Equal("Due Soon", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByDueStatus_Upcoming_ReturnsTasksDueAfter7Days()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "Upcoming", endType: TimingType.Fixed, endDate: DateTime.UtcNow.AddDays(10));
        await SeedTask(db, "Due Soon", endType: TimingType.Fixed, endDate: DateTime.UtcNow.AddDays(3));
        await SeedTask(db, "No End Date");

        var result = (await service.GetAllAsync(new TaskFilter { DueStatus = DueStatus.Upcoming })).ToList();

        Assert.Single(result);
        Assert.Equal("Upcoming", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByDueStatus_NoDueDate_ReturnsTasksWithNoEndDate()
    {
        var (service, db, _) = CreateService();
        await SeedTask(db, "No End Date");
        await SeedTask(db, "Has End Date", endType: TimingType.Fixed, endDate: DateTime.UtcNow.AddDays(5));

        var result = (await service.GetAllAsync(new TaskFilter { DueStatus = DueStatus.NoDueDate })).ToList();

        Assert.Single(result);
        Assert.Equal("No End Date", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByFromDate_ExcludesTasksEndingBefore()
    {
        var (service, db, _) = CreateService();
        var fromDate = DateTime.UtcNow;
        await SeedTask(db, "After", endType: TimingType.Fixed, endDate: fromDate.AddDays(2));
        await SeedTask(db, "Before", endType: TimingType.Fixed, endDate: fromDate.AddDays(-2));

        var result = (await service.GetAllAsync(new TaskFilter { FromDate = fromDate })).ToList();

        Assert.Single(result);
        Assert.Equal("After", result[0].Title);
    }

    [Fact]
    public async Task GetAll_FilterByToDate_ExcludesTasksStartingAfter()
    {
        var (service, db, _) = CreateService();
        var toDate = DateTime.UtcNow;
        await SeedTask(db, "Before", startType: TimingType.Fixed, startDate: toDate.AddDays(-2));
        await SeedTask(db, "After", startType: TimingType.Fixed, startDate: toDate.AddDays(2));

        var result = (await service.GetAllAsync(new TaskFilter { ToDate = toDate })).ToList();

        Assert.Single(result);
        Assert.Equal("Before", result[0].Title);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetById_ExistingId_ReturnsTask()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db, "My Task");

        var result = await service.GetByIdAsync(task.Id);

        Assert.Equal(task.Id, result.Id);
        Assert.Equal("My Task", result.Title);
    }

    [Fact]
    public async Task GetById_UnknownId_ThrowsNotFound()
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.GetByIdAsync(Guid.NewGuid()));
    }

    // --- CreateAsync ---

    [Fact]
    public async Task Create_WithTitle_CreatesTask()
    {
        var (service, _, __) = CreateService();

        var result = await service.CreateAsync(new CreateTaskRequest("New Task"));

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("New Task", result.Title);
    }

    [Fact]
    public async Task Create_WithAssignee_IncludesAssigneeUsername()
    {
        var (service, db, _) = CreateService();
        var user = await SeedUser(db, "alice");

        var result = await service.CreateAsync(new CreateTaskRequest("Task", AssigneeId: user.Id));

        Assert.Equal(user.Id, result.AssigneeId);
        Assert.Equal("alice", result.AssigneeUsername);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_BlankTitle_ThrowsValidation(string title)
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.CreateAsync(new CreateTaskRequest(title)));
    }

    [Fact]
    public async Task Create_UnknownAssigneeId_ThrowsNotFound()
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.CreateAsync(new CreateTaskRequest("Task", AssigneeId: Guid.NewGuid())));
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task Update_ValidRequest_UpdatesFields()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db, "Old Title");

        var result = await service.UpdateAsync(task.Id, new UpdateTaskRequest(
            "New Title", "Desc", null, TaskStatus.Complete, TaskPriority.High,
            ["tag1"], TimingType.None, null, TimingType.None, null, null));

        Assert.Equal("New Title", result.Title);
        Assert.Equal("Desc", result.Description);
        Assert.Equal(TaskStatus.Complete, result.Status);
        Assert.Equal(TaskPriority.High, result.Priority);
        Assert.Contains("tag1", result.Tags);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Update_BlankTitle_ThrowsValidation(string title)
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.UpdateAsync(task.Id, new UpdateTaskRequest(
                title, null, null, TaskStatus.Incomplete, TaskPriority.Medium,
                [], TimingType.None, null, TimingType.None, null, null)));
    }

    [Fact]
    public async Task Update_UnknownTaskId_ThrowsNotFound()
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.UpdateAsync(Guid.NewGuid(), new UpdateTaskRequest(
                "Title", null, null, TaskStatus.Incomplete, TaskPriority.Medium,
                [], TimingType.None, null, TimingType.None, null, null)));
    }

    [Fact]
    public async Task Update_UnknownAssigneeId_ThrowsNotFound()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.UpdateAsync(task.Id, new UpdateTaskRequest(
                "Title", null, Guid.NewGuid(), TaskStatus.Incomplete, TaskPriority.Medium,
                [], TimingType.None, null, TimingType.None, null, null)));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task Delete_ExistingTask_RemovesTask()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db);

        await service.DeleteAsync(task.Id);

        Assert.Null(await db.Tasks.FindAsync(task.Id));
    }

    [Fact]
    public async Task Delete_UnknownId_ThrowsNotFound()
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.DeleteAsync(Guid.NewGuid()));
    }

    // --- UpdatePositionAsync ---

    [Fact]
    public async Task UpdatePosition_SetsXAndY()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db);

        var result = await service.UpdatePositionAsync(task.Id, new UpdateTaskPositionRequest(10.5, 20.3));

        Assert.NotNull(result.PinnedPosition);
        Assert.Equal(10.5, result.PinnedPosition.X);
        Assert.Equal(20.3, result.PinnedPosition.Y);
    }

    [Fact]
    public async Task UpdatePosition_UnknownId_ThrowsNotFound()
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.UpdatePositionAsync(Guid.NewGuid(), new UpdateTaskPositionRequest(0, 0)));
    }

    // --- AddPredecessorAsync ---

    [Fact]
    public async Task AddPredecessor_ValidRelationship_PredecessorIdInResponse()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db, "Task");
        var predecessor = await SeedTask(db, "Predecessor");

        var result = await service.AddPredecessorAsync(task.Id, predecessor.Id);

        Assert.Contains(predecessor.Id, result.PredecessorIds);
    }

    [Fact]
    public async Task AddPredecessor_SelfReference_ThrowsValidation()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.AddPredecessorAsync(task.Id, task.Id));
    }

    [Fact]
    public async Task AddPredecessor_AlreadyExists_ThrowsConflict()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db, "Task");
        var predecessor = await SeedTask(db, "Predecessor");

        await service.AddPredecessorAsync(task.Id, predecessor.Id);

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.AddPredecessorAsync(task.Id, predecessor.Id));
    }

    [Fact]
    public async Task AddPredecessor_UnknownTaskId_ThrowsNotFound()
    {
        var (service, db, _) = CreateService();
        var predecessor = await SeedTask(db, "Predecessor");

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.AddPredecessorAsync(Guid.NewGuid(), predecessor.Id));
    }

    [Fact]
    public async Task AddPredecessor_UnknownPredecessorId_ThrowsNotFound()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db, "Task");

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.AddPredecessorAsync(task.Id, Guid.NewGuid()));
    }

    [Fact]
    public async Task AddPredecessor_PredecessorEndsAfterTaskStarts_ThrowsValidation()
    {
        var (service, db, _) = CreateService();
        var now = DateTime.UtcNow;
        var task = await SeedTask(db, "Task",
            startType: TimingType.Fixed, startDate: now.AddDays(1));
        var predecessor = await SeedTask(db, "Predecessor",
            endType: TimingType.Fixed, endDate: now.AddDays(3));

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.AddPredecessorAsync(task.Id, predecessor.Id));
    }

    // --- DeletePredecessorAsync ---

    [Fact]
    public async Task DeletePredecessor_ExistingRelationship_RemovesIt()
    {
        var (service, db, _) = CreateService();
        var task = await SeedTask(db, "Task");
        var predecessor = await SeedTask(db, "Predecessor");
        await service.AddPredecessorAsync(task.Id, predecessor.Id);

        await service.DeletePredecessorAsync(task.Id, predecessor.Id);

        var rel = await db.TaskRelationships
            .FirstOrDefaultAsync(r => r.TaskId == task.Id && r.PredecessorId == predecessor.Id);
        Assert.Null(rel);
    }

    [Fact]
    public async Task DeletePredecessor_UnknownRelationship_ThrowsNotFound()
    {
        var (service, _, __) = CreateService();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.DeletePredecessorAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    // --- Assignment notification ---

    [Fact]
    public async Task Update_AssigneeChanged_SendsNotification()
    {
        var (service, db, notifications) = CreateService();
        var user = await SeedUser(db);
        var task = await SeedTask(db);

        await service.UpdateAsync(task.Id, new UpdateTaskRequest(
            task.Title, null, user.Id, TaskStatus.Incomplete, TaskPriority.Medium, [], TimingType.None, null, TimingType.None, null, null));

        notifications.Verify(n => n.CreateAsync(
            user.Id, NotificationType.AssignmentAlert, task.Id, It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task Update_AssigneeUnchanged_NoNotification()
    {
        var (service, db, notifications) = CreateService();
        var user = await SeedUser(db);
        var task = await SeedTask(db, assigneeId: user.Id);

        await service.UpdateAsync(task.Id, new UpdateTaskRequest(
            task.Title, null, user.Id, TaskStatus.Incomplete, TaskPriority.Medium, [], TimingType.None, null, TimingType.None, null, null));

        notifications.Verify(n => n.CreateAsync(
            It.IsAny<Guid>(), It.IsAny<NotificationType>(), It.IsAny<Guid?>(), It.IsAny<string>()), Times.Never);
    }
}
