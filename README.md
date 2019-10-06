# serivce-communicator

Library for easy service communication

## Instalation

```sh
npm i serivce-communicator
```

## Usage

### Application 1 (server)
```js
const Communicator = require('serivce-communicator');

// Create communicator based on AMQP protocol (need connect to rabbitmq server)
const communicator = new Communicator({
  transport: {
    type: 'AMQP',
    host: 'localhost',
    port: 5672
  },
});

// Init communicator
communicator.init().then(() => {
  // Create service
  communicator.createService({
    // The name of the service that other applications can use to send requests
    name: 'users',
    // Handlers are functions that represent an API service
    handlers: {
      getUser: async (ctx) => {
          console.log('Handle getUser action');
          console.log(ctx) // { id: 1 }
          return { id: 1, name: 'username 1' }
      },
    },
  });
  communicator.startAllServices();
});
```
## Application 2 (client)
```js
const Communicator = require('serivce-communicator');

// Create communicator based on AMQP protocol (need connect to rabbitmq server)
const communicator = new Communicator({
  transport: {
    type: 'AMQP',
    host: 'localhost',
    port: 5672
  },
});

// Init communicator
communicator.init().then(() => {
  // Send request to 'users' service which hosted on application 1
  communicator.sendRequest('users', 'getUser', { id: 1 }, (response) => {
      console.log(response); // { id: 1, name: 'username 1' }
  });
});
```

## Examples

https://github.com/EliseevNP/nodetest

## License

MIT.