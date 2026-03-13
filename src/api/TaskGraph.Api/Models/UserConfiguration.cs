namespace TaskGraph.Api.Models;

public enum DefaultTasksView
{
    Graph,
    List
}

public enum TimeAxisDirection
{
    Horizontal,
    Vertical
}

public enum TimeAxisPosition
{
    Top,
    Bottom,
    Left,
    Right
}

public class UserConfiguration
{
    public DefaultTasksView DefaultTasksView { get; set; } = DefaultTasksView.Graph;
    public TimeAxisDirection TimeAxisDirection { get; set; } = TimeAxisDirection.Horizontal;
    public TimeAxisPosition TimeAxisPosition { get; set; } = TimeAxisPosition.Top;
    public int AutoSaveDelaySeconds { get; set; } = 2;
}
