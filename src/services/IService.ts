export interface IService {
  onResponse: (route: Buffer[], response: Buffer) => void;
  request(route: Buffer[], operation: any): void;
}
