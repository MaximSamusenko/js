import { Service } from "./serviceTypes";

export interface ServiceFactory<SERVICE_ID> {
    getService<T extends Service>(serviceId: SERVICE_ID, sendMessage: SendMessageFunc): T;
}

type SendMessageFunc = <R, SERVICE_ID>(serviceId: SERVICE_ID, actionName: string, args: any[]) => Promise<R>;

export class ProxyServiceFactory<SERVICE_ID> implements ServiceFactory<SERVICE_ID> {
    private readonly serviceProxies = new Map<SERVICE_ID, Service>();

    public getService<T extends Service>(serviceId: SERVICE_ID, sendMessage: SendMessageFunc): T {
        const existingProxy = this.serviceProxies.get(serviceId);
        if (existingProxy) return existingProxy as T;
        const newProxy = new Proxy<T>({} as T, { get: getFunc(serviceId, sendMessage) });
        this.serviceProxies.set(serviceId, newProxy);
        return newProxy;
    }
}

function getFunc<SERVICE_ID>(serviceId: SERVICE_ID, sendMessage: SendMessageFunc) {
    return <T extends Service, K extends keyof T>(_target: T, prop: K, _receiver): T[K] => {
        return new Proxy<T[K]>((() => { }) as any, { apply: applyFunc(serviceId, prop, sendMessage) });
    };
}

function applyFunc<SERVICE_ID>(serviceId: SERVICE_ID, actionName: string | number | symbol, sendMessage: SendMessageFunc) {
    return <T>(_target, _thisArg, argumentsList): Promise<T> => {
        return sendMessage(serviceId, actionName.toString(), argumentsList);
    }
}
