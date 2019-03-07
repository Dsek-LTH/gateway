import { setContext } from "apollo-link-context";
import { createHttpLink } from "apollo-link-http";
import { GraphQLSchema } from "graphql";
import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools";
import * as fetch from "node-fetch";
import * as rp from "request-promise-native";
import { URL } from "url";
import { IGraphQLService } from "../merge";
import { IService } from "./IService";

export class HttpService implements IService , IGraphQLService {
    public onResponse: (route: Buffer[], response: Buffer) => void;

    private url: URL;

    constructor(uri: string) {
        this.url = new URL(uri);
    }

    public request(route: Buffer[], operation: Buffer): void {
        const query = operation.toString("utf-8");
        console.log("query1", query);
        rp({
            body: query,
            headers: {
                "content-type": "application/json",
                "host": this.url.host,
            },
            method: "POST",
            uri: this.url.href,
        }).then((result) => this.onResponse && this.onResponse(route, Buffer.from(result, "utf-8")))
        .catch((error) => this.onResponse && this.onResponse(route, null));
    }

    public async fetchSchema(): Promise<GraphQLSchema> {

        const http = createHttpLink({ uri: this.url.href, fetch: fetch as unknown as GlobalFetch["fetch"] });

        const link = setContext((request, previousContext) => {
            console.log("previousContext", previousContext);
            return {
              headers: {
 // 'Authorization': `Bearer ${previousContext.graphqlContext && previousContext.graphqlContext.authKey}`,
                "content-type": "application/json",
                "host": this.url.host,
                    },
            }; }).concat(http);

        const schema = await introspectSchema(link);

        const executableSchema = makeRemoteExecutableSchema({
                      link,
                      schema,
                    });

        return executableSchema;
    }

}
