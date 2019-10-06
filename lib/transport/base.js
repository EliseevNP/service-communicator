module.exports = class BaseTransporter {
  constructor() {
    try {
      this.connection = null;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  connect() {
    throw new Error('Not implemented!');
  }

  disconnect() {
    throw new Error('Not implemented!');
  }

  bindHandlers() {
    throw new Error('Not implemented!');
  }

  sendRequest() {
    throw new Error('Not implemented!');
  }
};
