import type { NextConfig } from 'next';
import path from 'node:path';
import { localUrl } from './lib/local-config.mjs';

const config:NextConfig={
  turbopack:{root:path.resolve(process.cwd())},
  async redirects(){
    return [{source:'/:path*',has:[{type:'host',value:'localhost'}],destination:`${localUrl}/:path*`,permanent:false}];
  },
};
export default config;
