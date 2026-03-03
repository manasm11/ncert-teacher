import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/**",
  ]),
  // Disable strict rules that are causing issues
  {
    rules: {
      // Allow empty interfaces for React component props
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow explicit any for dynamic content
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unescaped quotes in JSX for readability
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
