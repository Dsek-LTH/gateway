export interface IService {
  onResponse: (route: Buffer[], response: Buffer) => void;
  query(route: Buffer[], query: Buffer): void;
}
