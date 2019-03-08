import * as _ from "lodash";
import {GraphQLFieldResolver, GraphQLResolveInfo, GraphQLSchema} from "graphql";
import {IFieldResolver, IResolverObject, IResolvers, MergeInfo, mergeSchemas} from "graphql-tools";
export interface IGraphQLService {
    fetchSchema: () => Promise<GraphQLSchema>;
}
export interface IStitch {
    wrapper: IGraphQLService,
    provider: IGraphQLService,
    wrapperType: string,
    wrappedField: string,
    wrappedType: string,
    providerMethod: {name: string,
                     args: {[parameterName: string]: string},
    }
}
export interface IResolver<TContext> {
        [graphQLType: string]: {
            [field: string]: {
                fragment: string,
                    resolve: IFieldResolver<IDict, TContext>
            }
        }
    }
export interface IDict {[key: string]: any; }
export class Gateway implements IGraphQLService {
    private services: IGraphQLService[];
    private stitches: IStitch[];

    constructor() {
        this.services = [];
        this.stitches =[];
    }

    public addService(service: IGraphQLService): void {
        this.services.push(service);
    }

    public addStitch(stitch: IStitch): void {
        this.stitches.push(stitch);
    }

    private async merge(services: IGraphQLService[], extensions: string[], resolvers: any): Promise<GraphQLSchema> {
    const schemas: GraphQLSchema[] = await Promise.all(services.map((s) => s.fetchSchema()));
    return mergeSchemas({resolvers, schemas: [...schemas, ...extensions]});
}
private async createLink<TContext>(stitch: IStitch): Promise<{typeDef: string, resolver: IResolver<TContext>}> {
    const schema = await stitch.provider.fetchSchema();
    const argValues: string[] = _.values(stitch.providerMethod.args);
    const resolve: IFieldResolver<IDict, TContext> = (wrapperNode, args, context, info) =>
    {
        return info.mergeInfo.delegateToSchema<TContext>({
            args: _.mapValues(stitch.providerMethod.args, (value: string) => wrapperNode[value]),
            context,
            fieldName: stitch.providerMethod.name,
            info,
            operation: "query",
            schema,
        });
    };
    return {
        resolver: {
            [stitch.wrapperType]: {
                [stitch.wrappedField]: {
                    fragment: `... on ${stitch.wrapperType} { ${argValues.join(",\n")} }`,
                    resolve,
                },
            },
        },
        typeDef: `extend type ${stitch.wrapperType} {
            ${stitch.wrappedField}: ${stitch.wrappedType}
        }`,
    };
}

public async fetchSchema<TContext>(): Promise<GraphQLSchema> {
        const links = await Promise.all(this.stitches.map(this.createLink));
    console.log(JSON.stringify(links, null, 2));
    const typeDefs = links.map(({typeDef}: {typeDef: string}) => typeDef);
    const resolvers = this.mergeResolvers(links.map(({resolver}: {resolver: IResolver<TContext>}) => resolver));
        return this.merge(this.services, typeDefs, resolvers);
    }


    private mergeResolvers<TContext>(resolvers: IResolver<TContext>[]) {
        const keyIntersection = (obj1: IDict, obj2: IDict): string[] => {
            const keySet1: string[] = Object.keys(obj1);
            return keySet1.filter(key => obj2[key] !== undefined);
        }

        const merge2 = (acc: IResolver<TContext>, curr: IResolver<TContext>): IResolver<TContext> => {
            // Shallow merge is wanted here, since it doesn't make sense to merge field contents
            const intersection: IResolver<TContext> = keyIntersection(acc, curr)
                .map((key: string): IResolver<TContext> => ({[key]: {...acc[key], ...curr[key]}}))
                .reduce((acc2, curr2) => ({...acc2, ...curr2}), {});
            return {...acc, ...curr, ...intersection};
        };
        return resolvers.reduce(merge2, {});
    }

}
