import { MessageSender } from "./messageSender";
import { JsonRpcMessageSerializer } from "./messageSerializer";
import { SimpleRequestIdRegistry } from "./requestIdRegistry";
import { ProxyServiceFactory } from "./serviceFactory";
import { ServiceProxy, SimpleServiceProxy } from "./serviceProxy";

export function serviceProxy<SERVICE_ID>(messageSender: MessageSender<string, null>): ServiceProxy<string, null, SERVICE_ID> {
    return new SimpleServiceProxy(messageSender, new JsonRpcMessageSerializer<SERVICE_ID>(), new SimpleRequestIdRegistry(), new ProxyServiceFactory<SERVICE_ID>(), (err) => {
        console.error(err);
    })
}