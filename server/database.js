const fs = require("fs");
const path = require("path");

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { messages: [] };
    this.indexes = {
      byId: new Map(),
      byDate: new Map(), // date string -> message ids
      byAuthor: new Map(), // author -> message ids
    };
    this.load();
    this.buildIndexes();
  }

  // Load data from file
  load() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      this.data = JSON.parse(raw);
      if (!this.data.messages) this.data.messages = [];
    } catch (error) {
      this.data = { messages: [] };
      this.save();
    }
  }

  // Force immediate save
  saveSync() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // Build in-memory indexes for faster queries
  buildIndexes() {
    this.indexes.byId.clear();
    this.indexes.byDate.clear();
    this.indexes.byAuthor.clear();

    this.data.messages.forEach((msg) => {
      // Index by ID
      this.indexes.byId.set(msg.id, msg);

      // Index by date (YYYY-MM-DD)
      const dateKey = msg.timestamp.split("T")[0];
      if (!this.indexes.byDate.has(dateKey)) {
        this.indexes.byDate.set(dateKey, []);
      }
      this.indexes.byDate.get(dateKey).push(msg);

      // Index by author
      const authorKey = msg.author.toLowerCase();
      if (!this.indexes.byAuthor.has(authorKey)) {
        this.indexes.byAuthor.set(authorKey, []);
      }
      this.indexes.byAuthor.get(authorKey).push(msg);
    });
  }

  // ============ QUERY METHODS ============

  // Get messages with pagination (newst first)
  getMessages(offset = 0, limit = 20) {
    const sorted = [...this.data.messages].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const paginated = sorted.slice(offset, offset + limit);

    return paginated.map((msg) => ({
      ...msg,
      replies: msg.replies || [],
      views: msg.views || 0,
    }));
  }

  // Search messages
  searchMessages(query, offset = 0, limit = 20) {
    const searchTerm = query.toLowerCase();

    const results = this.data.messages.filter(
      (msg) =>
        msg.text.toLowerCase().includes(searchTerm) ||
        msg.author.toLowerCase().includes(searchTerm)
    );

    // Sort by newest first
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const paginated = results.slice(offset, offset + limit);

    return paginated.map((msg) => ({
      ...msg,
      replies: msg.replies || [],
      views: msg.views || 0,
    }));
  }

  // Get messages by date
  getMessagesByDate(dateStr, offset = 0, limit = 50) {
    const results = this.indexes.byDate.get(dateStr) || [];

    // Sort by newest first
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const paginated = results.slice(offset, offset + limit);

    return paginated.map((msg) => ({
      ...msg,
      replies: msg.replies || [],
      views: msg.views || 0,
    }));
  }

  // ============ MUTATION METHODS ============

  // Insert a new message
  insertMessage(message) {
    const newMessage = {
      ...message,
      replies: [],
      views: 0,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    this.data.messages.push(newMessage);

    // Updaete indexes
    this.indexes.byId.set(newMessage.id, newMessage);

    const dateKey = newMessage.timestamp.split("T")[0];
    if (!this.indexes.byDate.has(dateKey)) {
      this.indexes.byDate.set(dateKey, []);
    }
    this.indexes.byDate.get(dateKey).push(newMessage);

    const authorKey = newMessage.author.toLowerCase();
    if (!this.indexes.byAuthor.has(authorKey)) {
      this.indexes.byAuthor.set(authorKey, []);
    }
    this.indexes.byAuthor.get(authorKey).push(newMessage);

    this.save();
    return newMessage;
  }

  // Insert a reply to a message
  insertReply(messageId, reply) {
    const message = this.indexes.byId.get(messageId);
    if (!message) return null;

    const newReply = {
      ...reply,
      timestamp: reply.timestamp || new Date().toISOString(),
    };

    if (!message.replies) {
      message.replies = [];
    }

    message.replies.push(newReply);
    this.save();
    return newReply;
  }

  // Increament view count
  incrementViews(messageId) {
    const message = this.indexes.byId.get(messageId);
    if (message) {
      message.views = (message.views || 0) + 1;
      this.save();
      return true;
    }
    return false;
  }

  // ============ UTILITY METHODS ============

  // Get total message count
  getMessageCount() {
    return this.data.messages.length;
  }

  // Get statistics
  getStats() {
    const totalMessages = this.data.messages.length;
    const totalReplies = this.data.messages.reduce(
      (sum, msg) => sum + (msg.replies ? msg.replies.length : 0),
      0
    );
    const totalViews = this.data.messages.reduce(
      (sum, msg) => sum + (msg.views || 0),
      0
    );

    const uniqueAuthors = new Set(this.data.messages.map((msg) => msg.author))
      .size;

    return {
      totalMessages,
      totalReplies,
      totalViews,
      uniqueAuthors,
    };
  }

  // Get database size
  getSize() {
    try {
      const stats = fs.statSync(this.filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // Save data to file (with debouncing for performance)
  save() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }, 100);
  }
}

module.exports = JsonDatabase;
