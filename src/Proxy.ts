import * as express from "express";

export class Proxy {
  private server: express.Express;

  constructor() {
    console.log("proxy started");
    this.server = express();

    this.server.get("/:service", this.query.bind(this));
    this.server.listen(8080, () => console.log("listening on *:8080"));
  }

  private query(req: express.Request, res: express.Response) {
    const service: string = req.params.service;
    res.end(`Hey world from ${service.toUpperCase()}!`);
  }
}
