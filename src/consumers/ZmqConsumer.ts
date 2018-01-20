import * as zmq from "zeromq";

import { IConsumer } from "./IConsumer";

export class ZmqConsumer implements IConsumer {
  public onRequest: (service: string, route: Buffer[], query: Buffer) => void;

  private socket: zmq.Socket;

  constructor(bind: string) {
    this.socket = zmq.socket("router");

    this.socket.on("message", this.dispatchRequest.bind(this));

    this.socket.bindSync(bind);
  }

  public respond(route: Buffer[], response: Buffer) {
    const data = route.concat([new Buffer(""), response]);
    this.socket.send(data);
  }

  private dispatchRequest(...parts: Buffer[]) {
    const delimiter = parts.findIndex((x) => x.length === 0);
    const envelope = parts.slice(0, delimiter);
    const content = parts.slice(delimiter + 1);

    // What should remain is service name and request
    if (content.length !== 2) {
      console.warn("invalid request received: ", parts);
      return;
    }

    const [serviceName, request] = content;
    this.onRequest(serviceName.toString("utf-8"), envelope, request);
  }
}