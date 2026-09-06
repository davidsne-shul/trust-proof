// Which headers each Supabase key format may travel in.
// Run: node proof/test/auth-headers.test.mjs
import assert from 'node:assert/strict';
import { supabaseAuth } from '../api/signup.js';

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log('  ok  ' + name); };

t('a new publishable key goes in apikey only', () => {
  const h = supabaseAuth('sb_publishable_R-HTezqfnAdQWjyWQS96Ag_SiNVRxdL');
  assert.equal(h.apikey, 'sb_publishable_R-HTezqfnAdQWjyWQS96Ag_SiNVRxdL');
  assert.equal(h.Authorization, undefined, 'a new key is rejected in Authorization');
});

t('a new secret key goes in apikey only', () => {
  const h = supabaseAuth('sb_secret_abc123');
  assert.equal(h.apikey, 'sb_secret_abc123');
  assert.equal(h.Authorization, undefined);
});

t('a legacy JWT still gets both, as it always expected', () => {
  // Short on purpose. A realistic base64 header is indistinguishable from a
  // real credential, and the publish audit is right to refuse to ship one.
  const jwt = 'eyJ.legacy.token';
  const h = supabaseAuth(jwt);
  assert.equal(h.apikey, jwt);
  assert.equal(h.Authorization, `Bearer ${jwt}`);
});

console.log(`\n${pass} checks passed.`);
