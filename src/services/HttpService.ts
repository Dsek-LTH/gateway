import * as rp from "request-promise-native";
import { URL } from "url";
import { IService } from "./IService";

export class HttpService implements IService {
    public onResponse: (route: Buffer[], response: Buffer) => void;

    private url: URL;

    constructor(uri: string) {
        this.url = new URL(uri);
    }

    public request(route: Buffer[], operation: Buffer): void {
        const query = operation.toString("utf-8");
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

}
