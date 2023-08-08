# simple-service-proxy

## how to use

1. Declare interfaces and service names
```
type SERVICE_ID = typeof PING_SERVICE | typeof PONG_SERVICE;

const PING_SERVICE = 'PING_SERVICE';
interface PingService extends Service {
    ping(message: string, value: string): Promise<string>;
    ping2(value: string): Promise<string>;
}

const PONG_SERVICE = 'PONG_SERVICE';
interface PongService extends Service {
    pong(message: string, value: string): Promise<string>;
}
```

2. Implement MessageSender interface
```
export interface MessageSender<T,K> {
    subscribe(onMessage: (message: T, context: K) => void): void;
    sendMessage(message: T, context?: K): void;
}
```

3. Create client and register services
```
const clientA = serviceProxy<SERVICE_ID>(messageSender)
    .register<PingService>(PING_SERVICE, {
        ping(message, value) {
            return Promise.resolve(`ping ${message} ${value}`);
        },
        ping2(value) {
            return Promise.resolve(`ping2 ${value}`);
        },
    }).register<PongService>(PONG_SERVICE, {
        pong(message, value) {
            return Promise.resolve(`pong A ${message} ${value}`);
        },
    });
```

4. Create another client to communicate with
```
const clientB = serviceProxy<SERVICE_ID>(messageSender)
            .register<PongService>(PONG_SERVICE, {
                pong(message, value) {
                    return Promise.resolve(`pong ${message} ${value}`);
                },
            });
```
5. Invoke services from clientB and vice versa
```
const pongService = clientA.getService<PongService>(PONG_SERVICE);
const res = await pongService.pong('pong message', 'pong value');
```
---
```
const pingService = clientB.getService<PingService>(PING_SERVICE);
const pingRes = await pingService.ping('ping message', 'ping value');
```