export interface IService {
  onResponse: (...parts: Buffer[]) => void;
  query(route: Buffer[], query: Buffer): void;
}
