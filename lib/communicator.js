const _ = require('lodash');
const AMQPTransport = require('./transport/amqp');

module.exports = class Communicator {
  constructor(options) {
    try {
      if (!_.isObject(options)) throw new Error('Unable to create Communicator. \'options\' parameter should have \'object\' type');
      if (!options.hasOwnProperty('transport')) throw new Error('Unable to create Communicator. \'options\' object should include \'transport\' property');
      if (!_.isObject(options.transport)) throw new Error('Unable to create Communicator. \'options.transport\' parameter should have \'object\' type');
      if (!options.transport.hasOwnProperty('type')) throw new Error('Unable to create Communicator. \'options.transport\' object should include \'type\' property');

      switch (options.transport.type) {
        case 'AMQP':
          this._transport = new AMQPTransport(options.transport);
          break;
        default:
          throw new Error('Unable to create Communicator. Unknown transport type');
      }

      this._services = {};
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async init() {
    await this._transport.connect();
  }

  createService(options) {
    try {
      if (!_.isObject(options)) throw new Error('Unable to create Service. \'options\' parameter should have \'object\' type');
      if (!options.hasOwnProperty('name')) throw new Error('Unable to create Service. \'options\' object should include \'name\' property');
      if (!options.hasOwnProperty('handlers')) throw new Error('Unable to create Service. \'options\' object should include \'handlers\' property');
      if (!_.isString(options.name)) throw new Error('Unable to create Service. \'options.name\' parameter should have \'string\' type');
      Object.keys(options.handlers).forEach((handlerName) => {
        if (!_.isFunction(options.handlers[handlerName])) {
          delete options.handlers[handlerName];
        }
      });
      this._services[options.name] = options.handlers;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  startAllServices() {
    Object.keys(this._services).forEach((serviceName) => {
      this._transport.bindHandlers(serviceName, this._services[serviceName]);
    });
  }

  async sendRequest(serviceName, actionName, ctx, responseHandler = null) {
    if (!_.isString(serviceName)) throw new Error('Request sending failure. \'serviceName\' parameter should have \'string\' type');
    if (!_.isString(actionName)) throw new Error('Request sending failure. \'actionName\' parameter should have \'string\' type');
    if (responseHandler !== null && !_.isFunction(responseHandler)) throw new Error('Request sending failure. \'responseHandler\' parameter should have \'function\' type');
    await this._transport.sendRequest(serviceName, actionName, ctx, responseHandler);
  }
};
