/**
 * Undo/redo history manager for drag-and-drop operations
 */

export interface HistoryEntry<T> {
  state: T;
  timestamp: number;
}

export class DragDropHistory<T> {
  private history: HistoryEntry<T>[] = [];
  private currentIndex = -1;
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Push a new state to history
   */
  push(state: T): void {
    // Remove any redo history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push({
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: Date.now()
    });

    // Maintain max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Undo to previous state
   */
  undo(): T | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.history[this.currentIndex].state;
  }

  /**
   * Redo to next state
   */
  redo(): T | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.history[this.currentIndex].state;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  current(): T | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentIndex].state;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Get history size
   */
  size(): number {
    return this.history.length;
  }
}
