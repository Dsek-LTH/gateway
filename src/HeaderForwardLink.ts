import { ApolloLink } from "apollo-link";
const whitelist = ["set-cookie"];

const headerForwardLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => { // this is the response from the service

        // operation.getContext() is technically available in outer function,
        // but the request to the service hasn't been made there, so response headers
        // won't be set
        const context = operation.getContext();

        // graphqlContext.res is the response to the client, where we want to set headers
        if (!(context.graphqlContext && context.graphqlContext.res)) {
            throw new Error("missing res in context from makeExecutableSchema");
        }

        const headers = context.response && context.response.headers;
        if (headers) {
            whitelist.forEach((headerType) => {
                const header = headers.get(headerType);
                if (header) {
                    context.graphqlContext.res.header(headerType, header);
                }
            });
        }
        return response; // pass along the response up the stack
    });
});

export default headerForwardLink;
