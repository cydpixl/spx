import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile,profileImage} from '../account-profile.mjs';

test('account appearance accepts HTTPS and raster images and bounds crop values', () => {
 assert.equal(profileImage('javascript:alert(1)'), '');
 assert.equal(profileImage('https://user:pass@example.test/avatar.png'), '');
 assert.equal(profileImage('data:image/svg+xml;base64,PHN2Zz4='), '');
 const profile=normalizeProfile({avatar:'https://example.test/avatar.png',banner:'data:image/gif;base64,R0lGODlh',x:-2,y:185,zoom:4});
 assert.equal(profile.banner,'data:image/gif;base64,R0lGODlh');
 assert.deepEqual([profile.x,profile.y,profile.zoom],[0,100,3]);
 assert.deepEqual(normalizeProfile(null),{avatar:'',banner:'',x:50,y:50,zoom:1});
});
