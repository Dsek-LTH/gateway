import * as zmq from "zeromq";

import { IService } from "./IService";

export class ZmqService implements IService {
  public onResponse: (...parts: Buffer[]) => void;

  private socket: zmq.Socket;

  constructor(port: number) {
    this.socket = zmq.socket("dealer");
    this.socket.bindSync(`tcp://*:${port}`);

    this.socket.on("message", (...parts: Buffer[]) => {
      console.log("received response: ", parts);
      if (this.onResponse) {
        this.onResponse(...parts);
      }
    });
  }

  public query(route: Buffer[], query: Buffer): void {
    const data = route.concat([Buffer.from([]), query]);
    console.log("dispatching query: ", data);
    this.socket.send(query);
  }
}
