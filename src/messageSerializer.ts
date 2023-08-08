
export type RequestMessage<SERVICE_ID> = { id: number, method: string, params: unknown[], service: SERVICE_ID };
export type ResponseMessage = { id: number, result: unknown };
export type ErrorMessage = { id: number, error: { code?: number, message: string, data?: Record<string, undefined> } }

export function isRequestMessage<SERVICE_ID>(message: RequestMessage<SERVICE_ID> | ResponseMessage | ErrorMessage): message is RequestMessage<SERVICE_ID> {
    return hasId(message) && 'service' in message && 'method' in message;
}

export function isErrorMessage<SERVICE_ID>(message: RequestMessage<SERVICE_ID> | ResponseMessage | ErrorMessage): message is ErrorMessage {
    return hasId(message) && 'error' in message;
}

export function isResponseMessage<SERVICE_ID>(message: RequestMessage<SERVICE_ID> | ResponseMessage | ErrorMessage): message is ResponseMessage {
    return hasId(message) && 'result' in message;
}

function hasId(message: any): message is { id: number } {
    return 'id' in message && Number.isInteger(message.id);
}

export interface MessageSerializer<T, SERVICE_ID> {
    serializeRequest(requestMessage: RequestMessage<SERVICE_ID>): T;
    serializeResponse(responseMessage: ResponseMessage): T;
    serializeError(errorMessage: ErrorMessage): T;
    deserializeMessage(message: T): RequestMessage<SERVICE_ID> | ResponseMessage | ErrorMessage;
}


export class JsonRpcMessageSerializer<SERVICE_ID> implements MessageSerializer<string, SERVICE_ID> {
    deserializeMessage(message: string): ResponseMessage | RequestMessage<SERVICE_ID> | ErrorMessage {
        return JSON.parse(message);
    }

    serializeResponse(responseMessage: ResponseMessage): string {
        return JSON.stringify(responseMessage);
    }

    serializeRequest(requestMessage: RequestMessage<SERVICE_ID>): string {
        return JSON.stringify(requestMessage);
    }

    serializeError(errorMessage: ErrorMessage): string {
        return JSON.stringify(errorMessage);
    }
}