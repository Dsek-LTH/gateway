import { setContext } from "apollo-link-context";
import { createHttpLink } from "apollo-link-http";
import { RetryLink } from "apollo-link-retry";
import { GraphQLSchema } from "graphql";
import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools";
import * as fetch from "node-fetch";
import { URL } from "url";
import { IGraphQLService } from "../Gateway";
import headerForwardLink from "../HeaderForwardLink";

export class HttpService implements IGraphQLService {

    private url: URL;

    constructor(uri: string) {
        this.url = new URL(uri);
    }

    public async fetchSchema(): Promise<GraphQLSchema> {

        const http = createHttpLink({ uri: this.url.href, fetch: fetch as unknown as GlobalFetch["fetch"] });
        const retryLink = new RetryLink();
        const baseLink = retryLink.concat(http);

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
        .concat(headerForwardLink)
        .concat(baseLink);

        // graphqlContext is only available through makeRemoteSchema,
        // so don't use links using graphqlContext with introspectSchema
        const schema = await introspectSchema(baseLink);

        const executableSchema = makeRemoteExecutableSchema({
                      link,
                      schema,
                    });

        return executableSchema;
    }
}
