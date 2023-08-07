import { Service } from "./serviceTypes";

export type SERVICE_ID = typeof PING_SERVICE | typeof PONG_SERVICE;

export const PING_SERVICE = 'PING_SERVICE';
export interface PingService extends Service {
    ping(message: string, value: string): Promise<string>;
    ping2(value: string): Promise<string>;
}

export const PONG_SERVICE = 'PONG_SERVICE';
export interface PongService extends Service {
    pong(message: string, value: string): Promise<string>;
}