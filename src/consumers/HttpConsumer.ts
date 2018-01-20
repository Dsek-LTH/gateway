import * as express from "express";
import * as uuid from "uuid";

import { Status, IConsumer } from "./IConsumer";

interface PendingRequest {
  resolve: (response: Buffer) => void,
  reject: (error: Status) => void,
}

export class HttpConsumer implements IConsumer {
  public onRequest: (service: string, route: Buffer[], query: Buffer) => void;

  private server: express.Application;
  private pending: { [id: string]: PendingRequest } = {};

  constructor(port: number) {
    this.server = express();
    this.server.get("/:service/:query", this.request.bind(this));
    this.server.listen(port, () => console.log(`http consumer listening on port ${port}`));
  }

  public respond(route: Buffer[], status: Status, response?: Buffer) {
    const id = route[0].toString("utf-8");
    const pending = this.pending[id];

    if (pending) {
      if (status === Status.Ok) {
        pending.resolve(response);
      }
      else {
        pending.reject(status);
      }
    }
  }

  private async request(req: express.Request, res: express.Response) {
    const service = req.params.service;
    const query = new Buffer(req.params.query, "utf-8");

    // Allocate a unique ID for the request, and save a promise with that ID
    // to be resolved by the response
    const id = uuid.v4();

    console.log(`http query ${id} @${service}: <${query}>`);

    const requestPromise = new Promise<Buffer>((resolve, reject) => {
      this.pending[id] = { resolve, reject };
    });

    const timeoutPromise = new Promise<Buffer>((resolve, reject) => {
      setTimeout(() => reject(Status.TimeOut), 1000);
    });

    // Initiate request
    if (this.onRequest) {
      const route = [new Buffer(id, "utf-8")];
      this.onRequest(service, route, query);
    }

    let response: Buffer;
    try {
      response = await Promise.race<Buffer>([requestPromise, timeoutPromise]);
    } catch(e) {
      switch (e) {
        case Status.NotFound: res.status(404); break;
        case Status.TimeOut: res.status(503); break;
        default: break;
      }
      res.send(e);
      return;
    } finally {
      // Remove promise from pending list
      this.pending[id] = null;
    }

    console.log(`http query ${id} response: <${response}>`);
    res.send(response.toString("utf-8"));
  }
}

