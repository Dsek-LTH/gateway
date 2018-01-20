import * as express from "express";
import * as uuid from "uuid";

import { IConsumer } from "./consumers/IConsumer";
import { IService } from "./services/IService";

import { ZmqService } from "./services/ZmqService";

export class Gateway {
  //private server: express.Express;
  private services: { [name: string]: IService } = {};
  private consumers: { [name: string]: IConsumer } = {};

  constructor() {
    console.log("gateway started");
    /*this.server = express();

    this.server.get("/:service", this.query.bind(this));
    this.server.listen(8080, () => console.log("listening on *:8080"));*/
  }

  public registerService(name: string, service: IService): void {
    this.services[name] = service;
    service.onResponse = this.onResponse.bind(this);
  }

  public registerConsumer(name: string, consumer: IConsumer): void {
    this.consumers[name] = consumer;
    consumer.onRequest = this.onRequest.bind(this, name);
  }

  private onResponse(...parts: Buffer[]): void {
    console.log("response received: ", parts);
  }

  private onRequest(consumerName: string, serviceName: string, route: Buffer[], query: Buffer): void {
    console.log(`request received over ${consumerName}: ${route} -> ${serviceName}: ${query}`);
    const service = this.services[serviceName];

    if (!service) {
      // TODO: return error message
      console.error("not implemented: service not found");
      return;
    }

    service.query([new Buffer("http", "utf-8")].concat(route), query);
  }

  private async query(req: express.Request, res: express.Response): Promise<void> {
    const serviceName: string = req.params.service;
    const service = this.services[serviceName];

    if (!service) {
      res.status(404).send("service not found");
      return;
    }

    // Allocate a unique id for the request.
    const id = uuid.v4();

    service.query([new Buffer("http", "utf-8"), new Buffer(id, "utf-8")], new Buffer(req.path, "utf-8"));
    res.send(id);
  }
}
