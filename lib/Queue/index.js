const EventEmitter = require("events");

class Queue extends EventEmitter {
  constructor() {
    super();
    this.actualQueue = [];
  }
  /**
   * Add the Item to the Queue
   * @param QueueItem
   * @returns Boolean
   */

  add(QueueItem) {
    this.actualQueue.unshift(QueueItem);
    this.emit("added", QueueItem);
  }

  /**
   * Removes Item from the Queue
   * @param index The index of the QueueItem to remove
   * @returns Boolean
   */

  remove(queueId) {
    const index = this.actualQueue.findIndex(item => item.id === queueId);
    this.actualQueue.splice(index, 1);
    this.emit("removed", this[index]);
  }

  find(func) {
    return this.actualQueue.find(func);
  }

  findIndex(func) {
    return this.actualQueue.findIndex(func);
  }

  map(func) {
    return this.actualQueue.map(func);
  }

  filter(func) {
    return this.actualQueue.filter(func);
  }

  reduce(func) {
    return this.actualQueue.reduce(func);
  }
}

module.exports = Queue;
