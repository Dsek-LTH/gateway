export enum Status {
  Ok = "OK",
  NotFound = "NOTFOUND",
  TimeOut = "TIMEOUT",
}

export interface IConsumer {
  onRequest: (service: string, route: Buffer[], query: Buffer) => void;
  respond(route: Buffer[], status: Status, response?: Buffer): void;
}
