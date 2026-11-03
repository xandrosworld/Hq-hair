import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSecurity,productionBoundary} from '../public-security.js';
const response=()=>({headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},redirect(n,url){this.statusCode=n;this.location=url}});
test('production blocks demo APIs and redirects public pages, retaining authenticated API paths',()=>{
 const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{for(const path of ['/api','/api/state','/api/reset']){const res=response();productionBoundary({path},res,()=>assert.fail('demo exposed'));assert.equal(res.statusCode,404)}
 for(const path of ['/','/demo','/anything']){const res=response();productionBoundary({path},res,()=>assert.fail('public app exposed'));assert.equal(res.location,'/workspace')}
 for(const path of ['/api/work/state','/workspace','/assets/main.js','/robots.txt']){let allowed=false;productionBoundary({path},response(),()=>allowed=true);assert.ok(allowed)}}finally{process.env.NODE_ENV=previous}
});
test('production adds restrictive CSP and HSTS only for HTTPS',()=>{const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';try{for(const secure of [true,false]){const res=response();publicSecurity({secure,path:'/workspace',accepts:()=>true},res,()=>{});assert.match(res.headers['Content-Security-Policy'],/script-src 'self'/);assert.match(res.headers['Content-Security-Policy'],/frame-ancestors 'none'/);assert.equal(!!res.headers['Strict-Transport-Security'],secure);assert.equal(res.headers['Cache-Control'],'no-store')}}finally{process.env.NODE_ENV=previous}});
