import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores (Flat config ignores are explicit)
  {
    ignores: [
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      // Generated code
      "src/generated/**",
      "**/generated/**",
      "**/.prisma/**",
      ".prisma/**",
    ],
  },
  // Next.js base + TypeScript rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Disable TS rules for plain JS and generated/vendor code to reduce noise
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: [
      "src/generated/**",
      "**/generated/**",
      "**/.prisma/**",
    ],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
