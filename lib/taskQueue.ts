/* eslint-disable */
"use client";

type Task<T> = {
  id: string;
  data: T;
  handler: (data: T) => Promise<void>;
};

export class TaskQueue<T = unknown> {
  private queue: Task<T>[] = [];
  private processing = false;

  add(handler: (data: T) => Promise<void>, data: T) {
    const task: Task<T> = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      data,
      handler
    };
    this.queue.push(task);
    void this.processNext();
    return task.id;
  }

  private async processNext() {
    if (this.processing) return;
    if (this.queue.length === 0) return;

    this.processing = true;
    const task = this.queue.shift();
    if (!task) {
      this.processing = false;
      return;
    }

    try {
      await task.handler(task.data);
    } finally {
      this.processing = false;
      void this.processNext();
    }
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }
}

export const taskQueue = new TaskQueue();

