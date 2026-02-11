declare module "archiver" {
  interface Archiver {
    on(event: "data", cb: (chunk: Buffer) => void): this;
    on(event: "end", cb: () => void): this;
    on(event: "error", cb: (err: Error) => void): this;
    directory(dir: string, dest: string | boolean): this;
    finalize(): void;
  }
  function archiver(format: string, options?: object): Archiver;
  export default archiver;
}
