export interface IConsumer {
  onRequest: (service: string, route: Buffer[], query: Buffer) => void;
  respond(route: Buffer[], response: Buffer): void;
}
