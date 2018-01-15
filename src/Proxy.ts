import * as express from "express";

export class Proxy {
  private server: express.Express;

  constructor() {
    console.log("proski started");
    this.server = express();

    this.server.get("/:service", this.query.bind(this));
    this.server.listen(8080, () => console.log("listening on *:8080"));
  }

  private query(req: express.Request, res: express.Response) {
    const service = req.params.service;
    res.end(`hello world from ${service}!`);
  }
}
