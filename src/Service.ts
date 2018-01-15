import * as zmq from "zeromq";

export class Service {
  private socket: zmq.Socket;

  private resolveReceive: (response: string) => void;

  constructor(port: number) {
    this.socket = zmq.socket("req");
    this.socket.bindSync(`tcp://*:${port}`);

    this.socket.on("message", (response: Buffer) => {
      this.resolveReceive(response.toString("utf-8"));
    });
  }

  public query(query: string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log("received query: ", query);
      this.resolveReceive = resolve;
      this.socket.send(query);
    });
  }
}
