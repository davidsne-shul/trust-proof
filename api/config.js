// What the browser is allowed to know. Read from the server env, so no key
// is ever written into a file in this repository.
//
// The Supabase anon key is public by design — RLS is what protects the data,
// and the policies in proof/supabase/001_proof_schema.sql are that protection.
// Nothing with real privilege (a service role key, GITHUB_TOKEN) is served here.
//
// Empty values are a valid answer: the site works GitHub-only until a Supabase
// project exists, and the added layer simply does not render.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  res.status(200).json({
    supabaseUrl: process.env.PROOF_SUPABASE_URL || '',
    supabaseAnonKey: process.env.PROOF_SUPABASE_ANON_KEY || '',
    // Whether /api/signup can actually store anything. A boolean, never the
    // key — a form that silently drops what people type is worse than none.
    signupOpen: Boolean(process.env.PROOF_SUPABASE_URL && process.env.PROOF_SUPABASE_SERVICE_KEY),
  });
}
