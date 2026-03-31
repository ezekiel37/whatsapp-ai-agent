export class KeyedQueue {
  private readonly tasks = new Map<string, Promise<unknown>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tasks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);

    this.tasks.set(
      key,
      next.finally(() => {
        if (this.tasks.get(key) === next) {
          this.tasks.delete(key);
        }
      })
    );

    return next;
  }
}
