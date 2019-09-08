const _ = require('lodash');
const BaseTransporter = require('./base');
const amqp = require('amqplib');
const uuidv4 = require('uuid/v4');

module.exports = class AMQPTransporter extends BaseTransporter {
  constructor(options) {
    try {
      super(options);

      if (!options.hasOwnProperty('host'))
        throw new Error(`Unable to create AMQPTransporter. 'options' object should include 'host' property`);
      if (!options.hasOwnProperty('port'))
        throw new Error(`Unable to create AMQPTransporter. 'options' object should include 'port' property`);

      this.options = options;
    } catch(err) {
      throw new Error(err.message);
    }
  }

  async connect() {
    this._connection = await amqp.connect(`amqp://${this.options.host}:${this.options.port}`);
    this._connection
      .on('error', (err) => {
        console.log(`[AMQPTransporter] ${err}`);
      })
      .on('close', (err) => {
        console.log(`[AMQPTransporter] AMQP connection is closed`);
      })
      .on('blocked', (reason) => {
        console.log(`[AMQPTransporter] AMQP connection is blocked. ${reason}`);
      })
      .on('unblocked', () => {
        console.log(`AMQP connection is unblocked`);
      });

    this.channel = await this._connection.createChannel();
    await this.channel.prefetch(1);
    this.channel
      .on('close', () => {
        console.log(`[AMQPTransporter] AMQP channel is closed`);
      })
      .on('error', (err) => {
        console.log(`[AMQPTransporter] AMQP channel error. ${err}`);
      })
      .on('drain', () => {
        console.log(`[AMQPTransporter] AMQP channel is drained`);
      })
      .on('return', (msg) => {
        console.log(`[AMQPTransporter] AMQP channel returned a message. ${msg}`);
      });

  }

  async disconnect() {
    if (!this.channel) return;

    await this.channel.close();
    await this._connection.close();
  }

  async bindHandlers(serviceName, handlers) {
    async function handlerWrapper(msg) {
      const content = JSON.parse(msg.content.toString());
      const response = await handlers[content.handlerName](content.ctx);
      const responseContent = {
        response,
        correlationId: content.correlationId
      }
      if (content.shouldResponse) {
        this.channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(responseContent), {
          deliveryMode: 2
        }));
      }
      this.channel.ack(msg);
    }

    const queueName = serviceName;
    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.consume(queueName, handlerWrapper.bind(this));
  }

  async sendRequest(serviceName, actionName, ctx, responseHandler = null) {
    let correlationId;
    let responseQueueName;
    let shouldResponse = false;
    if (responseHandler !== null) {
      correlationId = uuidv4();
      shouldResponse = true;
      async function handlerWrapper(msg) {
        const content = JSON.parse(msg.content.toString());
        if (content.correlationId === correlationId) {
          responseHandler(content.response);
        }
      }
      responseQueueName = (await this.channel.assertQueue('' , { durable: true, exclusive: true })).queue;
      this.channel.consume(responseQueueName, handlerWrapper.bind(this), { noAck: true });
    }

    const requestQueueName = serviceName;
    const content = {
      ctx,
      handlerName: actionName,
      shouldResponse,
      correlationId
    }
    this.channel.sendToQueue(requestQueueName, Buffer.from(JSON.stringify(content)), {
      replyTo: responseQueueName,
      deliveryMode: 2
    });
  }
}