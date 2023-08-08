import { MessageSender } from "./messageSender";
import { ErrorMessage, MessageSerializer, RequestMessage, ResponseMessage, isErrorMessage, isRequestMessage, isResponseMessage } from "./messageSerializer";
import { RequestIdRegistry as RequestStore } from "./requestIdRegistry";
import { ServiceFactory } from "./serviceFactory";
import { ServiceWithContext, Service } from "./serviceTypes";

export interface ServiceProxy<T, K, SERVICE_ID> {
    getService<S extends Service>(serviceId: SERVICE_ID): S;
    register<S extends Service>(serviceId: SERVICE_ID, service: ServiceWithContext<S, K>): ServiceProxy<T, K, SERVICE_ID>
}

export type ERR_CODE = 'INVALID_MESSAGE_FORMAT' | 'SERVICE_IS_NOT_IMPLEMENTED' | 'ACTION_NOT_FOUND' | 'INVALID_REQUEST_ID';
type ErrorHandler = (err: { errCode: ERR_CODE, details: Record<string, unknown> }) => void;

export class SimpleServiceProxy<T, K, SERVICE_ID> implements ServiceProxy<T, K, SERVICE_ID> {
    private readonly messageSender: MessageSender<T, K>;
    private readonly factory: ServiceFactory<SERVICE_ID>;
    private readonly messageSerializer: MessageSerializer<T, SERVICE_ID>;
    private readonly requestStore: RequestStore;
    private readonly serviceImplementations = new Map<SERVICE_ID, ServiceWithContext<Service, K>>();
    private readonly errorHandler: ErrorHandler;

    constructor(messageSender: MessageSender<T, K>, messageSerializer: MessageSerializer<T, SERVICE_ID>, requestStore: RequestStore, serviceFactory: ServiceFactory<SERVICE_ID>, errorHandler: ErrorHandler) {
        this.messageSender = messageSender;
        this.factory = serviceFactory;
        this.messageSerializer = messageSerializer;
        this.requestStore = requestStore;
        this.messageSender.subscribe(this.processMessage.bind(this));
        this.errorHandler = errorHandler;
    }

    public getService<S extends Service>(serviceId: SERVICE_ID): S {
        return this.factory.getService<S>(serviceId, this.sendRequestMessage.bind(this));
    }

    public register<S extends Service>(serviceId: SERVICE_ID, service: ServiceWithContext<S, K>): ServiceProxy<T, K, SERVICE_ID> {
        this.serviceImplementations.set(serviceId, service);
        return this;
    }

    protected processRequestMessage(message: RequestMessage<SERVICE_ID>, context: K): void {
        const serviceImplementation = this.serviceImplementations.get(message.service);
        if (!serviceImplementation) {
            this.errorHandler({ errCode: "SERVICE_IS_NOT_IMPLEMENTED", details: { message, context } });
            this.sendErrorMessage({ id: message.id, error: { message: "SERVICE_IS_NOT_IMPLEMENTED" } });
            return;
        }
        if (!(message.method in serviceImplementation)) {
            this.errorHandler({ errCode: "ACTION_NOT_FOUND", details: { message, context } });
            this.sendErrorMessage({ id: message.id, error: { message: "ACTION_NOT_FOUND" } });
            return;
        }

        const promise = serviceImplementation[message.method].call(serviceImplementation, ...message.params, context) as Promise<any>;
        promise.catch((err) => {
            this.sendErrorMessage({ id: message.id, error: { message: err.message } });
        }).then((value) => {
            this.sendResponseMessage(message.id, value);
        });
    }

    protected processResponseMessage(message: ResponseMessage): void {
        try {
            this.requestStore.resolveRequest(message.id, message.result);
        }
        catch (err) {
            this.errorHandler({ errCode: "INVALID_REQUEST_ID", details: { err, message } });
        }
    }

    protected processErrorMessage(message: ErrorMessage): void {
        try {
            this.requestStore.rejectRequest(message.id, message.error);
        }
        catch (err) {
            this.errorHandler({ errCode: "INVALID_REQUEST_ID", details: { err, message } });
        }
    }

    protected processInvalidMessage(message: Record<string, unknown>, context: K): void {
        this.errorHandler({ errCode: "INVALID_MESSAGE_FORMAT", details: { message, context } });

    }

    private sendRequestMessage<R>(service: SERVICE_ID, method: string, params: any[]): Promise<R> {
        const { id: requestId, promise } = this.requestStore.registerRequest<R>();
        const message = this.messageSerializer.serializeRequest({ id: requestId, service, method, params });
        this.messageSender.sendMessage(message);
        return promise;
    }

    private sendResponseMessage<R>(id: number, result: R): void {
        const message = this.messageSerializer.serializeResponse({ id, result });
        this.messageSender.sendMessage(message);
    }

    private sendErrorMessage<R>(error: ErrorMessage): void {
        const message = this.messageSerializer.serializeError(error);
        this.messageSender.sendMessage(message);
    }

    private processMessage(message: T, context: K) {
        const deserializedMessage = this.messageSerializer.deserializeMessage(message);
        if (isRequestMessage(deserializedMessage)) {
            this.processRequestMessage(deserializedMessage, context);
        } else if (isResponseMessage(deserializedMessage)) {
            this.processResponseMessage(deserializedMessage);
        } else if (isErrorMessage(deserializedMessage)) {
            this.processErrorMessage(deserializedMessage);
        } else {
            this.processInvalidMessage(deserializedMessage, context);
        }
    }
}