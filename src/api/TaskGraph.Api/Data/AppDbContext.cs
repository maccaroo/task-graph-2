using Microsoft.EntityFrameworkCore;
using TaskGraph.Api.Models;

namespace TaskGraph.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TaskRelationship> TaskRelationships => Set<TaskRelationship>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).ValueGeneratedOnAdd();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
            entity.OwnsOne(u => u.Configuration, cfg => cfg.ToJson());
        });

        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).ValueGeneratedOnAdd();
            entity.Property(t => t.Tags).HasColumnType("text[]");
            entity.HasOne(t => t.Assignee)
                  .WithMany()
                  .HasForeignKey(t => t.AssigneeId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TaskRelationship>(entity =>
        {
            entity.HasKey(r => new { r.TaskId, r.PredecessorId });
            entity.HasOne(r => r.Task)
                  .WithMany(t => t.Predecessors)
                  .HasForeignKey(r => r.TaskId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(r => r.Predecessor)
                  .WithMany(t => t.Successors)
                  .HasForeignKey(r => r.PredecessorId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).ValueGeneratedOnAdd();
            entity.HasOne(n => n.User)
                  .WithMany()
                  .HasForeignKey(n => n.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(n => n.Task)
                  .WithMany()
                  .HasForeignKey(n => n.TaskId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).ValueGeneratedNever();
            entity.HasOne(p => p.User)
                  .WithMany()
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
