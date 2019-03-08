import { setContext } from "apollo-link-context";
import { createHttpLink } from "apollo-link-http";
import { RetryLink } from "apollo-link-retry";
import { GraphQLSchema } from "graphql";
import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools";
import * as fetch from "node-fetch";
import { URL } from "url";
import { IGraphQLService } from "../Gateway";

export class HttpService implements IGraphQLService {

    private url: URL;

    constructor(uri: string) {
        this.url = new URL(uri);
    }

    public async fetchSchema(): Promise<GraphQLSchema> {

        const http = createHttpLink({ uri: this.url.href, fetch: fetch as unknown as GlobalFetch["fetch"] });

        const link = setContext((request, previousContext) => {
            const authHeader = previousContext.graphqlContext && previousContext.graphqlContext.authKey ?
                {Authorization: `Bearer ${previousContext.graphqlContext.authKey}`} : {};
            return {
              headers: {
                ...authHeader,
                "content-type": "application/json",
                "host": this.url.host,
                    },
            };
        })
        .concat(new RetryLink())
        .concat(http);

        const schema = await introspectSchema(link);

        const executableSchema = makeRemoteExecutableSchema({
                      link,
                      schema,
                    });

        return executableSchema;
    }

}
