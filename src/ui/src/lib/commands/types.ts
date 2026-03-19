export interface ICommand {
  undo(): Promise<void>
  redo(): Promise<void>
}
