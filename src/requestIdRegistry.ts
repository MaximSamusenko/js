export interface RequestIdRegistry {
    registerRequest<T>(): { id: number; promise: Promise<T>; };
    resolveRequest<T>(id: number, value: T): void;
    rejectRequest(id: number, error: unknown): void;
}

export class SimpleRequestIdRegistry implements RequestIdRegistry {

    private counter: number = 0;

    private requestMap = new Map<number, { resolve: (value: any) => void; reject: (error: unknown) => void }>();

    public registerRequest<T>(): { id: number; promise: Promise<T>; } {
        let resolve: (value: any) => void = () => { };
        let reject: (error: unknown) => void = () => { };

        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        this.requestMap.set(this.counter, { resolve, reject });
        return { id: this.counter++, promise };
    }

    public resolveRequest<T>(id: number, value: T): void {
        const request = this.requestMap.get(id);
        if (request === undefined) throw new Error(`Can't process response: request with Id=${id} doesn't exists`);
        request.resolve(value);
        this.requestMap.delete(id);
    }

    public rejectRequest(id: number, error: Error): void {
        const request = this.requestMap.get(id);
        if (request === undefined) throw new Error(`Can't process response rejection: request with Id=${id} doesn't exists`);
        request.reject(error);
        this.requestMap.delete(id);
    }
}