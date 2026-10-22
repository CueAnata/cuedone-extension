export interface SpatialTask { id: string; completed: boolean; }
export function isForwardCompletion(before: readonly SpatialTask[], after: readonly SpatialTask[]): boolean {
  return before.length > 0 && before.length === after.length &&
    before.every((task,i) => task.id === after[i].id && (!task.completed || after[i].completed)) &&
    before.some((task,i) => !task.completed && after[i].completed);
}
export function isFinalCompletion(before: readonly SpatialTask[], after: readonly SpatialTask[]): boolean {
  return isForwardCompletion(before,after) && after.every(task => task.completed);
}
export class GardenProgress {
  tasks: SpatialTask[] = [];
  revision = 0;
  private completed = 0;
  animate = false;
  finale = false;
  get total(): number { return this.tasks.length; }
  get complete(): number { return this.completed; }
  get ratio(): number { return this.total ? this.complete / this.total : 0; }
  publish(tasks: readonly SpatialTask[], allowFeedback: boolean): void {
    if (JSON.stringify(this.tasks) === JSON.stringify(tasks.map(({id,completed}) => ({id,completed})))) return;
    this.animate = allowFeedback && isForwardCompletion(this.tasks,tasks);
    this.finale = allowFeedback && isFinalCompletion(this.tasks,tasks);
    this.tasks = tasks.map(({id,completed}) => ({id,completed}));
    this.completed=this.tasks.reduce((count,task)=>count+Number(task.completed),0);
    this.revision++;
  }
}
