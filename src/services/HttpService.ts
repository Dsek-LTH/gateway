import { setContext } from "apollo-link-context";
import { createHttpLink } from "apollo-link-http";
import { RetryLink } from "apollo-link-retry";
import { GraphQLSchema } from "graphql";
import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools";
import * as fetch from "node-fetch";
import { URL } from "url";
import { authLink } from "../auth";
import { IGraphQLService } from "../Gateway";
import headerForwardLink from "../HeaderForwardLink";

export class HttpService implements IGraphQLService {

    private url: URL;
    private permissionWhitelist: string[] | null;

    // if permissions is set, the whole service is inaccessible to everyone
    // except logged in users with one of the permissions listed
    constructor(uri: string, permissions: string[] | null = null) {
        this.url = new URL(uri);
        this.permissionWhitelist = permissions;
    }

    public async fetchSchema(): Promise<GraphQLSchema> {

        const http = createHttpLink({ uri: this.url.href, fetch: fetch as unknown as GlobalFetch["fetch"] });
        const retryLink = new RetryLink();
        const baseLink = retryLink.concat(http);

        const link = setContext((request, previousContext) => ({
            ...previousContext,
            headers: {
                ...previousContext.headers,
                host: this.url.host, // for services returning invalid host header
            },
        }))
        .concat(authLink(this.permissionWhitelist))
        .concat(headerForwardLink)
        .concat(baseLink);

        // graphqlContext is made available through makeRemoteExecutableSchema,
        // and plain graphql(), but not introspectSchema,
        // so don't use links using graphqlContext with introspectSchema
        const schema = await introspectSchema(baseLink);

        const executableSchema = makeRemoteExecutableSchema({
                      link,
                      schema,
                    });

        return executableSchema;
    }
}
