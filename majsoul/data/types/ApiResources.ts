export interface ApiResources {
  version: string;
  clientVersion: string;
  pbVersion: string;
  serverList: {
    servers: string[];
  };
  protobufDefinition: any;
}
