declare module "bcryptjs" {
  function hashSync(password: string, saltRounds: number): string;
  function compareSync(password: string, hash: string): boolean;
  function hash(password: string, saltRounds: number): Promise<string>;
  function compare(password: string, hash: string): Promise<boolean>;
  export = { hashSync, compareSync, hash, compare };
}
