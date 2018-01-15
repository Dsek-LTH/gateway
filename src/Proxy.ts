import * as express from "express";

import { Service } from "./Service";

export class Proxy {
  private server: express.Express;
  private services: { [name: string]: Service };

  constructor() {
    console.log("proxy started");

    this.services = {
      login: new Service(1337),
    };

    this.server = express();

    this.server.get("/:service", this.query.bind(this));
    this.server.listen(8080, () => console.log("listening on *:8080"));
  }

  private async query(req: express.Request, res: express.Response): Promise<void> {
    const serviceName: string = req.params.service;
    const service = this.services[serviceName];

    if (!service) {
      res.status(404).send("service not found");
      return;
    }

    const response = await service.query(req.path);
    res.send(response);
  }
}
