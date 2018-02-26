export enum Status {
  Ok = "OK",
  NotFound = "NOTFOUND",
  TimeOut = "TIMEOUT",
}

export interface IConsumer {
  onRequest: (service: string, route: Buffer[], operation: any) => void;
  respond(route: Buffer[], status: Status, response?: Buffer): void;
}
