interface ServiceFunc {
    (...args: any[]): Promise<any>;
}

type FunctionWithContext<F extends ServiceFunc, Context> = (...args: [...funcArgs: Parameters<F>, context?: Context]) => ReturnType<F>

export type ServiceWithContext<T extends Service, Context> = { [Property in keyof T]: FunctionWithContext<T[Property], Context> }

export interface Service {
    [key: string | symbol]: ServiceFunc;
}