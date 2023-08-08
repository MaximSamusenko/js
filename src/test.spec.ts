import { serviceProxy } from "./index";
import { MessageSender } from "./messageSender";
import { PING_SERVICE, PONG_SERVICE, PingService, PongService, SERVICE_ID } from "./services";


describe('basic', () => {
    it('works', async () => {
        let sendMessageToB: (message, context) => void;
        let sendMessageToA: (message, context) => void;

        const messageSenderA: MessageSender<string, null> = {
            sendMessage: (message, context) => {
                sendMessageToB!(message, context);
            },
            subscribe: (action) => {
                sendMessageToA = action;
            }
        }

        const messageSenderB: MessageSender<string, null> = {
            sendMessage: (message, context) => {
                sendMessageToA!(message, context);
            },
            subscribe: (action) => {
                sendMessageToB = action;
            }
        }

        const serviceProxyA = serviceProxy<SERVICE_ID>(messageSenderA)
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

        const serviceProxyB = serviceProxy<SERVICE_ID>(messageSenderB)
            .register<PongService>(PONG_SERVICE, {
                pong(message, value) {
                    return Promise.resolve(`pong ${message} ${value}`);
                },
            });

        const pongService = serviceProxyA.getService<PongService>(PONG_SERVICE);
        const res = await pongService.pong('pong message', 'pong value');

        const pingBService = serviceProxyA.getService<PingService>(PING_SERVICE);
        await expect(() => pingBService.ping('test', 'test')).rejects.toMatchInlineSnapshot(`
{
  "message": "SERVICE_IS_NOT_IMPLEMENTED",
}
`);

        expect(res).toMatchInlineSnapshot(`"pong pong message pong value"`);

        const pingService = serviceProxyB.getService<PingService>(PING_SERVICE);
        const pingRes = await pingService.ping('ping message', 'ping value');
        expect(pingRes).toMatchInlineSnapshot(`"ping ping message ping value"`);

        const ping2Res = await pingService.ping2('ping2 message');
        expect(ping2Res).toMatchInlineSnapshot(`"ping2 ping2 message"`);

        const pongServiceA = serviceProxyB.getService<PongService>(PONG_SERVICE);
        const pongARes = await pongServiceA.pong('pongA', 'pongA');
        expect(pongARes).toMatchInlineSnapshot(`"pong A pongA pongA"`);
    })
});