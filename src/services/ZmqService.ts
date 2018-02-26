import * as zmq from "zeromq";

import { IService } from "./IService";

export class ZmqService implements IService {
  public onResponse: (route: Buffer[], response: Buffer) => void;

  private socket: zmq.Socket;

  constructor(port: number) {
    this.socket = zmq.socket("dealer");
    this.socket.bindSync(`tcp://*:${port}`);

    this.socket.on("message", (...parts: Buffer[]) => {
      console.log("received response: ", parts);

      if (this.onResponse) {
        const delimiter = parts.findIndex((x) => x.length === 0);
        const route = parts.slice(0, delimiter);
        const response = parts[delimiter + 1];
        this.onResponse(route, response);
      }
    });
  }

  public request(route: Buffer[], operation: any): void {
    const data = [].concat(route).concat([Buffer.from([]), new Buffer(operation, "utf-8")]);
    console.log("dispatching query: ", data);
    this.socket.send(data);
  }
}
