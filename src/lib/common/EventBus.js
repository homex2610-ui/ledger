// src/lib/common/EventBus.js
/**
 * Simple publish/subscribe event bus.
 * Listeners are stored per event name; `emit` calls them synchronously.
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /** Register a listener for an event */
  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(handler);
    return () => this.off(event, handler); // returns unsubscribe function
  }

  /** Unregister a listener */
  off(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event].delete(handler);
      if (this.listeners[event].size === 0) delete this.listeners[event];
    }
  }

  /** Emit an event with optional payload */
  emit(event, payload) {
    if (!this.listeners[event]) return;
    // copy to avoid mutation during iteration
    const handlers = Array.from(this.listeners[event]);
    handlers.forEach((h) => {
      try {
        h(payload);
      } catch (e) {
        console.error(`EventBus handler error for ${event}:`, e);
      }
    });
  }
}

// Export a singleton instance for app-wide usage
const eventBus = new EventBus();
export default eventBus;
