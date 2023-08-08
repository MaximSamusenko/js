interface MessageSender<T, K> {
    subscribe(onMessage: (message: T, context: K) => void): void;
    sendMessage(message: T, context?: K): void;
}

type RequestMessage<SERVICE_ID> = {
    id: number;
    method: string;
    params: unknown[];
    service: SERVICE_ID;
};
type ResponseMessage = {
    id: number;
    result: unknown;
};
type ErrorMessage = {
    id: number;
    error: {
        code?: number;
        message: string;
        data?: Record<string, undefined>;
    };
};
interface MessageSerializer<T, SERVICE_ID> {
    serializeRequest(requestMessage: RequestMessage<SERVICE_ID>): T;
    serializeResponse(responseMessage: ResponseMessage): T;
    serializeError(errorMessage: ErrorMessage): T;
    deserializeMessage(message: T): RequestMessage<SERVICE_ID> | ResponseMessage | ErrorMessage;
}
declare class JsonRpcMessageSerializer<SERVICE_ID> implements MessageSerializer<string, SERVICE_ID> {
    deserializeMessage(message: string): ResponseMessage | RequestMessage<SERVICE_ID> | ErrorMessage;
    serializeResponse(responseMessage: ResponseMessage): string;
    serializeRequest(requestMessage: RequestMessage<SERVICE_ID>): string;
    serializeError(errorMessage: ErrorMessage): string;
}

interface RequestIdRegistry {
    registerRequest<T>(): {
        id: number;
        promise: Promise<T>;
    };
    resolveRequest<T>(id: number, value: T): void;
    rejectRequest(id: number, error: unknown): void;
}
declare class SimpleRequestIdRegistry implements RequestIdRegistry {
    private counter;
    private requestMap;
    registerRequest<T>(): {
        id: number;
        promise: Promise<T>;
    };
    resolveRequest<T>(id: number, value: T): void;
    rejectRequest(id: number, error: Error): void;
}

interface ServiceFunc {
    (...args: any[]): Promise<any>;
}
type FunctionWithContext<F extends ServiceFunc, Context> = (...args: [...funcArgs: Parameters<F>, context?: Context]) => ReturnType<F>;
type ServiceWithContext<T extends Service, Context> = {
    [Property in keyof T]: FunctionWithContext<T[Property], Context>;
};
interface Service {
    [key: string | symbol]: ServiceFunc;
}

interface ServiceFactory<SERVICE_ID> {
    getService<T extends Service>(serviceId: SERVICE_ID, sendMessage: SendMessageFunc): T;
}
type SendMessageFunc = <R, SERVICE_ID>(serviceId: SERVICE_ID, actionName: string, args: any[]) => Promise<R>;
declare class ProxyServiceFactory<SERVICE_ID> implements ServiceFactory<SERVICE_ID> {
    private readonly serviceProxies;
    getService<T extends Service>(serviceId: SERVICE_ID, sendMessage: SendMessageFunc): T;
}

interface ServiceProxy<T, K, SERVICE_ID> {
    getService<S extends Service>(serviceId: SERVICE_ID): S;
    register<S extends Service>(serviceId: SERVICE_ID, service: ServiceWithContext<S, K>): ServiceProxy<T, K, SERVICE_ID>;
}
type ERR_CODE = 'INVALID_MESSAGE_FORMAT' | 'SERVICE_IS_NOT_IMPLEMENTED' | 'ACTION_NOT_FOUND' | 'INVALID_REQUEST_ID';
type ErrorHandler = (err: {
    errCode: ERR_CODE;
    details: Record<string, unknown>;
}) => void;
declare class SimpleServiceProxy<T, K, SERVICE_ID> implements ServiceProxy<T, K, SERVICE_ID> {
    private readonly messageSender;
    private readonly factory;
    private readonly messageSerializer;
    private readonly requestStore;
    private readonly serviceImplementations;
    private readonly errorHandler;
    constructor(messageSender: MessageSender<T, K>, messageSerializer: MessageSerializer<T, SERVICE_ID>, requestStore: RequestIdRegistry, serviceFactory: ServiceFactory<SERVICE_ID>, errorHandler: ErrorHandler);
    getService<S extends Service>(serviceId: SERVICE_ID): S;
    register<S extends Service>(serviceId: SERVICE_ID, service: ServiceWithContext<S, K>): ServiceProxy<T, K, SERVICE_ID>;
    protected processRequestMessage(message: RequestMessage<SERVICE_ID>, context: K): void;
    protected processResponseMessage(message: ResponseMessage): void;
    protected processErrorMessage(message: ErrorMessage): void;
    protected processInvalidMessage(message: Record<string, unknown>, context: K): void;
    private sendRequestMessage;
    private sendResponseMessage;
    private sendErrorMessage;
    private processMessage;
}

declare function serviceProxy<SERVICE_ID>(messageSender: MessageSender<string, null>): ServiceProxy<string, null, SERVICE_ID>;

export { JsonRpcMessageSerializer, MessageSender, ProxyServiceFactory, SimpleRequestIdRegistry, SimpleServiceProxy, serviceProxy };
