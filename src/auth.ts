import { ApolloLink, Observable } from "apollo-link";
import { Request } from "express";
import { GraphQLError } from "graphql";
import * as jwt from "jsonwebtoken";

const validateToken = (token: string, publicKey: string) =>
    jwt.verify(token, publicKey, {
        algorithms: ["RS256"],
        issuer: "login",
    });

interface IJWT {
    sub: string;
}

// validate token throws if expired
export const getUser = (req: Request, publicKey: string) => {
    if (!req.cookies.auth) { return null; }
    const authHeader = JSON.parse(req.cookies.auth);
    if (!authHeader) { return null; }
    const token = validateToken(authHeader, publicKey) as IJWT;
    return token && JSON.parse(token.sub);
};

const hasAnyCommonElement = (listA: any[], listB: any[]) =>
    !!listA.find((e) => listB.includes(e));

const error401 = () => new Observable((observer) => {
    console.log("observer", observer);
    observer.error(new GraphQLError("permission denied"));
    observer.complete();
});

export const authLink = (permissionWhitelist: string[] | null) => new ApolloLink((operation, forward) => {
    const context = operation.getContext();
    const user = context.graphqlContext.user;

    if (permissionWhitelist && (!user || !hasAnyCommonElement(permissionWhitelist, user.permissions))) {
        console.log("no permission to access this service");
        return error401();
    }

    const authHeader = user ? {"Dsek-User": JSON.stringify(user)} : {};

    operation.setContext({
        ...context,
        headers: {
            ...context.headers,
            ...authHeader,
            "content-type": "application/json",
        },
    });

    return forward(operation);
});
