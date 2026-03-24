namespace TaskGraph.Api.DTOs.Users;

public record UpdateUserConfigurationRequest(
    string DefaultTasksView,
    string TimeAxisDirection,
    string TimeAxisPosition,
    int AutoSaveDelaySeconds,
    bool ShowMiniMap
);
