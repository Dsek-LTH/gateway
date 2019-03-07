import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as express from "express";
import * as expressGraphQL from "express-graphql";
import { buildClientSchema, ExecutionResult, graphql, GraphQLSchema, introspectionQuery,
    IntrospectionQuery, printSchema, Source } from "graphql";
import { introspectSchema, makeRemoteExecutableSchema, mergeSchemas } from "graphql-tools";
import * as uuid from "uuid";

import { IConsumer, Status } from "./IConsumer";

interface IPendingRequest {
  resolve: (response: Buffer) => void;
  reject: (error: Status) => void;
}

export class HttpConsumer implements IConsumer {
  public onRequest: (service: string, route: Buffer[], query: Buffer) => void;

  private server: express.Application;
  private pending: { [id: string]: IPendingRequest } = {};
  private schema: GraphQLSchema;

  constructor(port: number) {
    this.server = express();
    this.server.use(cors());
    this.server.use("/:service", bodyParser.raw({
      type: "*/*",
    })).post("/:service", this.request.bind(this));

    this.server.listen(port, () => console.log(`http consumer listening on port ${port}`));

    setTimeout(async () => {
        this.schema = await this.stitchSchema(["roles", "roleInstances"]);
        this.server.use("/", expressGraphQL({
        graphiql: true,
        schema: this.schema,
      }));
        console.log("schema", printSchema(this.schema));
    }, 1000);
  }

  public respond(route: Buffer[], status: Status, response?: Buffer) {
    const id = route[0].toString("utf-8");
    const pending = this.pending[id];

    if (pending) {
      if (status === Status.Ok) {
        pending.resolve(response);
      } else {
        pending.reject(status);
      }
    }
  }

  private createFetcher(service: string): (operation: any) => Promise<ExecutionResult> {
    return async (operation: { query: string, variables: any }) => {
      console.log("operation", operation);
      const op = {
        query: operation.query,
        variables: operation.variables,
      };
      return JSON.parse((await this.execute(service, new Buffer(JSON.stringify(op), "utf-8"))).toString("utf-8"));
    };
  }

  private async getSchema(service: string): Promise<GraphQLSchema> {
    try {
      const fetcher = this.createFetcher(service);
      const introspectResult = await fetcher({query: introspectionQuery});
      const schema = makeRemoteExecutableSchema({
        fetcher,
        schema: buildClientSchema(introspectResult.data as IntrospectionQuery),
      });
      return schema;
    } catch (e) {
      return null;
    }
  }

        /*private getGraphQLClient(service: string): GraphQLClient {
        const fetcher = this.createFetcher(service);
        return {
            execute: (query: DocumentNode, variables?: { [name: string]: any },
            context?: any, introspect?: boolean): Promise<ClientExecutionResult> => {
                return fetcher({query, variables});
            }
        }
    }*/

  private async stitchSchema(services: string[]): Promise<GraphQLSchema> {
    const schemas: any[] = (await Promise.all(services.map((s) => this.getSchema(s)))).filter((x) => x != null);
      /*schemas.push(`
      extend type Message {
        author: User
      }
    `);*/
      /*const clients = services.map(service => ({namespace: service, schema: this.getGraphQLClient(service)}));
      return weaveSchemas({endpoints: clients});
       */
    return mergeSchemas({
        /*resolvers: (mergeInfo) => ({
        Message: {
          author: {
            fragment: `fragment MessageFragment on Message { authorId }`,
            resolve(parent: any, args: any, context: any, info: any) {
              console.log(parent, args);
              const id: string = parent.authorId;
              return mergeInfo.delegate(
                "query",
                "user",
                {id},
                context,
                info,
              );
            },
          },
        },
      }),*/
      schemas,
    });
  }

  private async request(req: express.Request, res: express.Response) {
    const service = req.params.service;
    const operation = (req.body as Buffer).toString("utf-8");

    // Allocate a unique ID for the request, and save a promise with that ID
    // to be resolved by the response
    console.log(`http query @${service}: <${operation}>`);

    try {
      const response = await this.execute(service, operation);
      console.log(`http query response: <${response}>`);
      res.send(response.toString("utf-8"));
    } catch (e) {
      switch (e) {
        case Status.NotFound: res.status(404); break;
        case Status.TimeOut: res.status(503); break;
        default: break;
      }
      res.send(e);
      return;
    }
  }

  private async execute(service: string, operation: any): Promise<Buffer> {
    const id = uuid.v4();

    const requestPromise = new Promise<Buffer>((resolve, reject) => {
      this.pending[id] = { resolve, reject };
    });

    const timeoutPromise = new Promise<Buffer>((resolve, reject) => {
      setTimeout(() => reject(Status.TimeOut), 1000);
    });

    // Initiate request
    if (this.onRequest) {
      const route = [new Buffer(id, "utf-8")];
      this.onRequest(service, route, operation);
    }

    try {
      return await Promise.race<Buffer>([requestPromise, timeoutPromise]);
    } finally {
      // Remove promise from pending list
      this.pending[id] = null;
    }
  }

  private async query(req: express.Request, res: express.Response) {
    const query = (req.body as Buffer).toString("utf-8");
  }
}
