export interface MessageSender<T,K> {
    subscribe(onMessage: (message: T, context: K) => void): void;
    sendMessage(message: T, context?: K): void;
}